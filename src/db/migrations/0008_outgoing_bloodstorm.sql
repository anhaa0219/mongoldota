CREATE TABLE "match_memories" (
	"clerk_user_id" text NOT NULL,
	"match_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_memories_clerk_user_id_match_id_pk" PRIMARY KEY("clerk_user_id","match_id")
);
--> statement-breakpoint
ALTER TABLE "match_memories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_memories" ADD CONSTRAINT "match_memories_clerk_user_id_gsi_tokens_clerk_user_id_fk" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."gsi_tokens"("clerk_user_id") ON DELETE cascade ON UPDATE no action;