import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Revoke statistics - persistent counter for all revokes across wallets
export const revokeStats = pgTable("revoke_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalRevokes: integer("total_revokes").notNull().default(0),
  totalValueSecured: decimal("total_value_secured", { precision: 20, scale: 2 }).notNull().default("0"),
});

export const revokeHistory = pgTable("revoke_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  tokenAddress: text("token_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  spenderAddress: text("spender_address").notNull(),
  valueSecured: decimal("value_secured", { precision: 20, scale: 2 }).notNull().default("0"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRevokeHistorySchema = createInsertSchema(revokeHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertRevokeHistory = z.infer<typeof insertRevokeHistorySchema>;
export type RevokeHistory = typeof revokeHistory.$inferSelect;
export type RevokeStats = typeof revokeStats.$inferSelect;
