CREATE TABLE `cash_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_locations_name_unique` ON `cash_locations` (`name`);--> statement-breakpoint
CREATE TABLE `cash_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`hospital_name` text NOT NULL,
	`currency_symbol` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cash_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`source` text NOT NULL,
	`destination` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_transactions_voucher_unique` ON `cash_transactions` (`voucher`);--> statement-breakpoint
CREATE INDEX `idx_cash_transactions_date_type` ON `cash_transactions` (`date`,`type`);