import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PostStore } from "../src/db.js";

test("tạo, duyệt và lên lịch bài", () => {
  const store = new PostStore(join(mkdtempSync(join(tmpdir(), "fanpage-")), "test.db"));
  const post = store.create({ content: "Nội dung thử nghiệm", source_url: "https://example.com/1" });
  assert.equal(post.status, "draft");
  store.setStatus(post.id, "approved");
  const scheduled = store.setStatus(post.id, "scheduled", { scheduled_at: "2026-07-27T01:00:00.000Z" });
  assert.equal(scheduled?.status, "scheduled");
  assert.equal(store.due("2026-07-27T02:00:00.000Z").length, 1);
});
