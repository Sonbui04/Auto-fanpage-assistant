import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "Thiếu TELEGRAM_BOT_TOKEN"),
  TELEGRAM_ADMIN_IDS: z.string().min(1, "Thiếu TELEGRAM_ADMIN_IDS"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_BASE_URL: z.string().url().optional().or(z.literal("")),
  FACEBOOK_PAGE_ID: z.string().optional(),
  FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_GRAPH_VERSION: z.string().default("v25.0"),
  TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
  DATABASE_PATH: z.string().default("./data/fanpage.db"),
  REQUIRE_APPROVAL: z.enum(["true", "false"]).default("true")
});

export function loadConfig() {
  const env = envSchema.parse(process.env);
  return {
    ...env,
    adminIds: new Set(env.TELEGRAM_ADMIN_IDS.split(",").map((id) => Number(id.trim()))),
    requireApproval: env.REQUIRE_APPROVAL === "true"
  };
}

export type Config = ReturnType<typeof loadConfig>;
