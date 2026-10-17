CREATE INDEX "action_log_created_idx" ON "action_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expiresAt");