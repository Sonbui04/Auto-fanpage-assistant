import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import type { Post, PostStatus } from "./types.js";

export class PostStore {
  private db: Database.Database;

  constructor(path: string) {
    const fullPath = resolve(path);
    mkdirSync(dirname(fullPath), { recursive: true });
    this.db = new Database(fullPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_url TEXT,
        source_title TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        scheduled_at TEXT,
        facebook_post_id TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source_url
        ON posts(source_url) WHERE source_url IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_posts_due
        ON posts(status, scheduled_at);
    `);
  }

  create(input: Pick<Post, "content"> & Partial<Pick<Post, "source_url" | "source_title" | "image_url">>) {
    const result = this.db.prepare(`
      INSERT INTO posts (source_url, source_title, content, image_url)
      VALUES (@source_url, @source_title, @content, @image_url)
    `).run({
      source_url: input.source_url ?? null,
      source_title: input.source_title ?? null,
      content: input.content,
      image_url: input.image_url ?? null
    });
    return this.get(Number(result.lastInsertRowid))!;
  }

  get(id: number): Post | undefined {
    return this.db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Post | undefined;
  }

  list(limit = 10): Post[] {
    return this.db.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT ?").all(limit) as Post[];
  }

  setStatus(id: number, status: PostStatus, fields: Partial<Pick<Post, "scheduled_at" | "facebook_post_id" | "error">> = {}) {
    this.db.prepare(`
      UPDATE posts SET
        status = @status,
        scheduled_at = COALESCE(@scheduled_at, scheduled_at),
        facebook_post_id = COALESCE(@facebook_post_id, facebook_post_id),
        error = @error,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id,
      status,
      scheduled_at: fields.scheduled_at ?? null,
      facebook_post_id: fields.facebook_post_id ?? null,
      error: fields.error ?? null
    });
    return this.get(id);
  }

  due(nowIso: string): Post[] {
    return this.db.prepare(`
      SELECT * FROM posts
      WHERE status = 'scheduled' AND scheduled_at <= ?
      ORDER BY scheduled_at ASC LIMIT 20
    `).all(nowIso) as Post[];
  }
}
