import type { Config } from "./config.js";
import type { Post } from "./types.js";

export async function publishToFacebook(post: Post, config: Config): Promise<string> {
  if (!config.FACEBOOK_PAGE_ID || !config.FACEBOOK_PAGE_ACCESS_TOKEN) {
    throw new Error("Chưa cấu hình FACEBOOK_PAGE_ID hoặc FACEBOOK_PAGE_ACCESS_TOKEN");
  }
  const graph = `https://graph.facebook.com/${config.FACEBOOK_GRAPH_VERSION}`;
  const endpoint = post.image_url
    ? `${graph}/${config.FACEBOOK_PAGE_ID}/photos`
    : `${graph}/${config.FACEBOOK_PAGE_ID}/feed`;
  const body = new URLSearchParams({
    access_token: config.FACEBOOK_PAGE_ACCESS_TOKEN
  });
  if (post.image_url) {
    body.set("url", post.image_url);
    body.set("caption", post.content);
  } else {
    body.set("message", post.content);
  }
  const response = await fetch(endpoint, { method: "POST", body, signal: AbortSignal.timeout(30_000) });
  const payload = await response.json() as { id?: string; post_id?: string; error?: { message?: string } };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Facebook API lỗi ${response.status}`);
  }
  return payload.post_id || payload.id || "unknown";
}
