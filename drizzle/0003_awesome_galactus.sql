CREATE TABLE `store_creation_claims` (
	`user_id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_creation_claims_store_unique` ON `store_creation_claims` (`store_id`);