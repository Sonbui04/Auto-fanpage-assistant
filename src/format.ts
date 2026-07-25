import type { Post } from "./types.js";

export function preview(post: Post) {
  const content = post.content.length > 3000 ? `${post.content.slice(0, 3000)}…` : post.content;
  return [
    `Bài #${post.id} · ${post.status}`,
    post.scheduled_at ? `Lịch: ${post.scheduled_at}` : null,
    post.source_title ? `Nguồn: ${post.source_title}` : null,
    "",
    content
  ].filter((line) => line !== null).join("\n");
}
