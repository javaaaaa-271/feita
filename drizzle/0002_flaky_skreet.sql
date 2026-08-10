CREATE TABLE `marco_6_3b_upload_budget` (
	`scope` text PRIMARY KEY NOT NULL,
	`upload_attempts` integer DEFAULT 0 NOT NULL,
	`upload_bytes` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
