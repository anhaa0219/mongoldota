CREATE TABLE "live_coach_slots" (
	"clerk_user_id" text NOT NULL,
	"slot" text NOT NULL,
	"reserved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "live_coach_slots_clerk_user_id_slot_pk" PRIMARY KEY("clerk_user_id","slot")
);
--> statement-breakpoint
ALTER TABLE "live_coach_slots" ENABLE ROW LEVEL SECURITY;