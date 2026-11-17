CREATE TABLE "steam_links" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"steam_id" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "steam_links" ENABLE ROW LEVEL SECURITY;