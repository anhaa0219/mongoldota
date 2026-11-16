CREATE TABLE "ai_advice" (
	"account_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_advice_account_id_kind_pk" PRIMARY KEY("account_id","kind")
);
--> statement-breakpoint
ALTER TABLE "ai_advice" ENABLE ROW LEVEL SECURITY;