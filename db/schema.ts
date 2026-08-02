import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").notNull().unique(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  department: text("department").notNull(),
  type: text("type").notNull(),
  method: text("method").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("transactions_date_idx").on(table.date)]);

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  request: text("request").notNull(),
  department: text("department").notNull(),
  requester: text("requester").notNull(),
  amount: real("amount").notNull(),
  age: text("age").notNull(),
  status: text("status").notNull().default("Pending"),
});
