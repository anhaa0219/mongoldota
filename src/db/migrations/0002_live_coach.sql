CREATE TABLE "gsi_tokens" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"steam_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gsi_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "gsi_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "live_states" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"match_id" text,
	"snapshot" jsonb,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "live_tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"match_id" text NOT NULL,
	"clock_seconds" integer NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"plan" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_tips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "locked_drafts" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"draft" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locked_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "live_tips_user_match_idx" ON "live_tips" USING btree ("clerk_user_id","match_id");