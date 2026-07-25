import { Bot, Context, InlineKeyboard } from "grammy";
import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import type { PostStore } from "./db.js";
import { createFanpageDraft, extractArticle, searchGoogleNews } from "./content.js";
import { preview } from "./format.js";
import { publishToFacebook } from "./facebook.js";
import type { SourceArticle } from "./types.js";

function keyboard(id: number) {
  return new InlineKeyboard()
    .text("✅ Duyệt", `approve:${id}`)
    .text("🚀 Đăng ngay", `publish:${id}`).row()
    .text("❌ Hủy", `cancel:${id}`);
}

export function createBot(config: Config, store: PostStore) {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  const pendingSources = new Map<string, SourceArticle>();
  bot.use(async (ctx, next) => {
    if (!ctx.from || !config.adminIds.has(ctx.from.id)) {
      await ctx.reply("Bạn không có quyền sử dụng bot này.");
      return;
    }
    await next();
  });

  bot.command("start", (ctx) => ctx.reply([
    "Bot biên tập và đăng Fanpage đã sẵn sàng.",
    "",
    "/search <từ khóa> — tìm 5 tin mới",
    "/url <đường dẫn> — tạo bản nháp từ URL",
    "/list — danh sách bài gần đây",
    "/view <id> — xem bài",
    "/schedule <id> <YYYY-MM-DD HH:mm> — duyệt và lên lịch",
    "/publish <id> — đăng ngay bài đã duyệt",
    "/cancel <id> — hủy bài"
  ].join("\n")));

  bot.command("search", async (ctx) => {
    const query = ctx.match.trim();
    if (!query) return ctx.reply("Ví dụ: /search trí tuệ nhân tạo");
    const status = await ctx.reply(`Đang tìm nội dung về “${query}”…`);
    try {
      const articles = await searchGoogleNews(query);
      if (!articles.length) return ctx.api.editMessageText(ctx.chat.id, status.message_id, "Không tìm thấy nội dung.");
      for (const article of articles) {
        const sourceKey = randomUUID().slice(0, 12);
        pendingSources.set(sourceKey, article);
        await ctx.reply(`${article.title}\n${article.url}`, {
          reply_markup: new InlineKeyboard().text("✍️ Tạo bản nháp", `draftsrc:${sourceKey}`)
        });
      }
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, `Đã tìm thấy ${articles.length} nguồn.`);
    } catch (error) {
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, `Lỗi tìm kiếm: ${String(error)}`);
    }
  });

  async function draftFromArticle(ctx: Context, article: SourceArticle) {
    await ctx.answerCallbackQuery({ text: "Đang tổng hợp…" }).catch(() => undefined);
    const content = await createFanpageDraft(
      article,
      config.OPENAI_API_KEY,
      config.OPENAI_MODEL,
      config.OPENAI_BASE_URL
    );
    let post;
    try {
      post = store.create({
        source_url: article.url,
        source_title: article.title,
        content,
        image_url: article.imageUrl
      });
    } catch {
      throw new Error("Nguồn này đã được tạo thành bài trước đó.");
    }
    await ctx.reply(preview(post), { reply_markup: keyboard(post.id) });
  }

  bot.command("url", async (ctx) => {
    const url = ctx.match.trim();
    if (!/^https?:\/\//i.test(url)) return ctx.reply("Ví dụ: /url https://example.com/bai-viet");
    try {
      const article = await extractArticle(url);
      const content = await createFanpageDraft(
        article,
        config.OPENAI_API_KEY,
        config.OPENAI_MODEL,
        config.OPENAI_BASE_URL
      );
      const post = store.create({ source_url: article.url, source_title: article.title, content, image_url: article.imageUrl });
      await ctx.reply(preview(post), { reply_markup: keyboard(post.id) });
    } catch (error) {
      await ctx.reply(`Không tạo được bản nháp: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  bot.callbackQuery(/^draftsrc:([a-f0-9-]+)$/, async (ctx) => {
    try {
      const article = pendingSources.get(ctx.match[1]);
      if (!article) throw new Error("Nguồn đã hết hạn, vui lòng tìm lại.");
      pendingSources.delete(ctx.match[1]);
      await draftFromArticle(ctx, article);
    } catch (error) {
      await ctx.reply(`Không tạo được bản nháp: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  bot.command("list", async (ctx) => {
    const posts = store.list();
    await ctx.reply(posts.length
      ? posts.map((p) => `#${p.id} · ${p.status} · ${p.source_title || p.content.slice(0, 50)}`).join("\n")
      : "Chưa có bài.");
  });

  bot.command("view", async (ctx) => {
    const post = store.get(Number(ctx.match.trim()));
    if (!post) return ctx.reply("Không tìm thấy bài.");
    await ctx.reply(preview(post), { reply_markup: keyboard(post.id) });
  });

  bot.callbackQuery(/^approve:(\d+)$/, async (ctx) => {
    const post = store.setStatus(Number(ctx.match[1]), "approved");
    await ctx.answerCallbackQuery({ text: "Đã duyệt" });
    if (post) await ctx.editMessageText(preview(post), { reply_markup: keyboard(post.id) });
  });

  bot.callbackQuery(/^cancel:(\d+)$/, async (ctx) => {
    store.setStatus(Number(ctx.match[1]), "cancelled");
    await ctx.answerCallbackQuery({ text: "Đã hủy" });
    await ctx.editMessageReplyMarkup();
  });

  async function publish(id: number) {
    const post = store.get(id);
    if (!post) throw new Error("Không tìm thấy bài.");
    if (!["approved", "scheduled", "failed"].includes(post.status)) {
      throw new Error("Bài phải được duyệt trước khi đăng.");
    }
    store.setStatus(id, "publishing");
    try {
      const facebookId = await publishToFacebook(post, config);
      return store.setStatus(id, "published", { facebook_post_id: facebookId })!;
    } catch (error) {
      store.setStatus(id, "failed", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  bot.callbackQuery(/^publish:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Đang đăng…" });
    try {
      const post = await publish(Number(ctx.match[1]));
      await ctx.reply(`Đã đăng bài #${post.id}. Facebook ID: ${post.facebook_post_id}`);
    } catch (error) {
      await ctx.reply(`Đăng thất bại: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  bot.command("publish", async (ctx) => {
    try {
      const post = await publish(Number(ctx.match.trim()));
      await ctx.reply(`Đã đăng bài #${post.id}. Facebook ID: ${post.facebook_post_id}`);
    } catch (error) {
      await ctx.reply(`Đăng thất bại: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  bot.command("schedule", async (ctx) => {
    const match = ctx.match.trim().match(/^(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
    if (!match) return ctx.reply("Ví dụ: /schedule 12 2026-07-27 08:30");
    const scheduledAt = new Date(`${match[2]}T${match[3]}:00+07:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return ctx.reply("Thời gian phải hợp lệ và ở tương lai.");
    const post = store.get(Number(match[1]));
    if (!post || !["draft", "approved", "failed"].includes(post.status)) return ctx.reply("Không tìm thấy bài hoặc trạng thái không phù hợp.");
    store.setStatus(post.id, "scheduled", { scheduled_at: scheduledAt.toISOString() });
    await ctx.reply(`Đã duyệt và lên lịch bài #${post.id}: ${scheduledAt.toLocaleString("vi-VN", { timeZone: config.TIMEZONE })}`);
  });

  bot.command("cancel", async (ctx) => {
    const post = store.setStatus(Number(ctx.match.trim()), "cancelled");
    await ctx.reply(post ? `Đã hủy bài #${post.id}.` : "Không tìm thấy bài.");
  });

  bot.catch(({ error }) => console.error("Telegram bot error:", error));
  return { bot, publish };
}
