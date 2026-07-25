export type PostStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export interface Post {
  id: number;
  source_url: string | null;
  source_title: string | null;
  content: string;
  image_url: string | null;
  status: PostStatus;
  scheduled_at: string | null;
  facebook_post_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceArticle {
  title: string;
  url: string;
  excerpt: string;
  imageUrl?: string;
  publishedAt?: string;
}
