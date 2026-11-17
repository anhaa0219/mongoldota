-- Live Coach: the browser (signed in with Clerk) may read only its own rows; all writes go through the server.
CREATE POLICY "own live state" ON "live_states" FOR SELECT TO authenticated USING ("clerk_user_id" = (auth.jwt() ->> 'sub'));--> statement-breakpoint
CREATE POLICY "own locked draft" ON "locked_drafts" FOR SELECT TO authenticated USING ("clerk_user_id" = (auth.jwt() ->> 'sub'));--> statement-breakpoint
CREATE POLICY "own live tips" ON "live_tips" FOR SELECT TO authenticated USING ("clerk_user_id" = (auth.jwt() ->> 'sub'));--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "live_states", "live_tips";
