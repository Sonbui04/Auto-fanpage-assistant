import * as cheerio from "cheerio";
import Parser from "rss-parser";
import OpenAI from "openai";
import type { SourceArticle } from "./types.js";

const parser = new Parser();

export async function searchGoogleNews(query: string, limit = 5): Promise<SourceArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
  const feed = await parser.parseURL(url);
  return feed.items.slice(0, limit).map((item) => ({
    title: item.title ?? "Không có tiêu đề",
    url: item.link ?? "",
    excerpt: item.contentSnippet ?? item.content ?? "",
    publishedAt: item.isoDate
  })).filter((item) => item.url);
}

export async function extractArticle(url: string): Promise<SourceArticle> {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 ContentResearchBot/1.0" },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Không đọc được URL (${response.status})`);
  const html = await response.text();
  const $ = cheerio.load(html);
  $("script,style,noscript,nav,footer,header,aside").remove();
  const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim();
  const imageUrl = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content")
    || $('meta[name="description"]').attr("content");
  const paragraphs = $("article p, main p, p").map((_, node) => $(node).text().trim()).get()
    .filter((text) => text.length > 60).slice(0, 12).join("\n");
  return { title: title || url, url, excerpt: (paragraphs || description || "").slice(0, 8000), imageUrl };
}

export async function createFanpageDraft(
  article: SourceArticle,
  apiKey?: string,
  model = "gpt-5-mini",
  baseURL?: string
): Promise<string> {
  if (!apiKey) {
    const summary = article.excerpt.replace(/\s+/g, " ").slice(0, 800);
    return `${article.title}\n\n${summary}\n\nNguồn tham khảo: ${article.url}`;
  }
  const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: [
          "Bạn là biên tập viên Fanpage tiếng Việt.",
          "Viết bài mới dựa trên dữ liệu nguồn, không sao chép nguyên văn.",
          "Không bịa thông tin; giữ giọng văn rõ ràng, tự nhiên.",
          "Cuối bài ghi 'Nguồn tham khảo:' và URL.",
          "Độ dài khoảng 150-300 từ, có tiêu đề, đoạn ngắn và 3-5 hashtag phù hợp."
        ].join(" ")
      },
      {
        role: "user",
        content: `Tiêu đề: ${article.title}\nURL: ${article.url}\nNội dung nguồn:\n${article.excerpt}`
      }
    ]
  });
  const content = response.choices[0]?.message.content?.trim();
  if (!content) throw new Error("AI không trả về nội dung.");
  return content.includes(article.url)
    ? content
    : `${content}\n\nNguồn tham khảo: ${article.url}`;
}
