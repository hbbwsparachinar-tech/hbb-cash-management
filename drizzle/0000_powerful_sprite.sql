CREATE TABLE `approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request` text NOT NULL,
	`department` text NOT NULL,
	`requester` text NOT NULL,
	`amount` real NOT NULL,
	`age` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`department` text NOT NULL,
	`type` text NOT NULL,
	`method` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_reference_unique` ON `transactions` (`reference`);