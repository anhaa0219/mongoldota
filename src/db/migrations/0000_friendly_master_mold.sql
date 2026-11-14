CREATE TABLE "matches" (
	"match_id" bigint PRIMARY KEY NOT NULL,
	"parsed" boolean NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"duration_s" integer NOT NULL,
	"radiant_win" boolean NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "player_matches" (
	"account_id" bigint NOT NULL,
	"match_id" bigint NOT NULL,
	"hero_id" integer NOT NULL,
	"player_slot" integer NOT NULL,
	"won" boolean NOT NULL,
	CONSTRAINT "player_matches_account_id_match_id_pk" PRIMARY KEY("account_id","match_id")
);
--> statement-breakpoint
ALTER TABLE "player_matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_start_time_idx" ON "matches" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "player_matches_account_idx" ON "player_matches" USING btree ("account_id");