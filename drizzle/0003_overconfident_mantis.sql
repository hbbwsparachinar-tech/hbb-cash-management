PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cash_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher` text,
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
INSERT INTO `__new_cash_transactions`("id", "voucher", "date", "type", "category", "amount", "source", "destination", "description", "created_at") SELECT "id", "voucher", "date", "type", "category", "amount", "source", "destination", "description", "created_at" FROM `cash_transactions`;--> statement-breakpoint
DROP TABLE `cash_transactions`;--> statement-breakpoint
ALTER TABLE `__new_cash_transactions` RENAME TO `cash_transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `cash_transactions_voucher_unique` ON `cash_transactions` (`voucher`);--> statement-breakpoint
CREATE INDEX `idx_cash_transactions_date_type` ON `cash_transactions` (`date`,`type`);