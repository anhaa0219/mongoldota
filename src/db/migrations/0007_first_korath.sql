CREATE TABLE "ai_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"match_id" text,
	"prompt_tokens" integer,
	"answer_tokens" integer,
	"ok" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "ai_calls_user_time_idx" ON "ai_calls" USING btree ("clerk_user_id","created_at");