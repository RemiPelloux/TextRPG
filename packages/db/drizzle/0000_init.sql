CREATE TABLE "action_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"heroId" uuid NOT NULL,
	"action" jsonb NOT NULL,
	"version" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_runs" (
	"day" integer NOT NULL,
	"heroId" uuid NOT NULL,
	"heroName" text NOT NULL,
	"score" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_runs_day_heroId_pk" PRIMARY KEY("day","heroId")
);
--> statement-breakpoint
CREATE TABLE "heroes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"paragon" integer DEFAULT 0 NOT NULL,
	"power" integer DEFAULT 0 NOT NULL,
	"deepestFloor" integer DEFAULT 0 NOT NULL,
	"classId" text,
	"state" jsonb NOT NULL,
	"schemaVersion" integer NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"endpoint" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"keys" jsonb NOT NULL,
	"heroId" uuid,
	"lastNotifiedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"tokenHash" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"passwordHash" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_log" ADD CONSTRAINT "action_log_heroId_heroes_id_fk" FOREIGN KEY ("heroId") REFERENCES "public"."heroes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_runs" ADD CONSTRAINT "daily_runs_heroId_heroes_id_fk" FOREIGN KEY ("heroId") REFERENCES "public"."heroes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heroes" ADD CONSTRAINT "heroes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_heroId_heroes_id_fk" FOREIGN KEY ("heroId") REFERENCES "public"."heroes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_log_hero_idx" ON "action_log" USING btree ("heroId","createdAt");--> statement-breakpoint
CREATE INDEX "daily_runs_score_idx" ON "daily_runs" USING btree ("day","score");--> statement-breakpoint
CREATE INDEX "heroes_user_idx" ON "heroes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "heroes_power_idx" ON "heroes" USING btree ("paragon","level","power");--> statement-breakpoint
CREATE INDEX "heroes_depth_idx" ON "heroes" USING btree ("deepestFloor");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));