import { loadConfig } from "./config.js";
import { PostStore } from "./db.js";
import { createBot } from "./bot.js";

const config = loadConfig();
const store = new PostStore(config.DATABASE_PATH);
const { bot, publish } = createBot(config, store);

await bot.api.setMyCommands([
  { command: "start", description: "Show usage instructions" },
  { command: "search", description: "Search content by keyword" },
  { command: "url", description: "Create a draft from a URL" },
  { command: "list", description: "List recent posts" },
  { command: "view", description: "View a post" },
  { command: "schedule", description: "Approve and schedule a post" },
  { command: "publish", description: "Publish an approved post" },
  { command: "cancel", description: "Cancel a post" }
]);

setInterval(async () => {
  for (const post of store.due(new Date().toISOString())) {
    try {
      await publish(post.id);
      await bot.api.sendMessage([...config.adminIds][0], `✅ Đã tự động đăng bài #${post.id} theo lịch.`);
    } catch (error) {
      await bot.api.sendMessage(
        [...config.adminIds][0],
        `❌ Bài #${post.id} đăng theo lịch thất bại: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}, 30_000);

console.log("Telegram Fanpage bot đang chạy…");
bot.start({
  onStart: (info) => console.log(`Bot @${info.username} đã kết nối.`)
});
