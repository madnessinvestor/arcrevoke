import { type User, type InsertUser, type RevokeStats, type InsertRevokeHistory, type RevokeHistory, users, revokeStats, revokeHistory } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Revoke stats methods
  getRevokeStats(): Promise<{ totalRevokes: number; totalValueSecured: string }>;
  recordRevoke(data: InsertRevokeHistory): Promise<RevokeHistory>;
  getRecentRevokes(limit?: number): Promise<RevokeHistory[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getRevokeStats(): Promise<{ totalRevokes: number; totalValueSecured: string }> {
    const [stats] = await db.select().from(revokeStats);
    if (!stats) {
      // Initialize stats if not exists
      await db.insert(revokeStats).values({
        totalRevokes: 0,
        totalValueSecured: "0"
      });
      return { totalRevokes: 0, totalValueSecured: "0" };
    }
    return { 
      totalRevokes: stats.totalRevokes, 
      totalValueSecured: stats.totalValueSecured 
    };
  }

  async recordRevoke(data: InsertRevokeHistory): Promise<RevokeHistory> {
    // Insert the revoke record
    const [record] = await db.insert(revokeHistory).values(data).returning();
    
    // Update global stats
    const valueSecured = parseFloat(data.valueSecured || "0") || 0;
    
    const [existingStats] = await db.select().from(revokeStats);
    
    if (!existingStats) {
      await db.insert(revokeStats).values({
        totalRevokes: 1,
        totalValueSecured: valueSecured.toFixed(2)
      });
    } else {
      const newTotal = parseFloat(existingStats.totalValueSecured) + valueSecured;
      await db.update(revokeStats)
        .set({
          totalRevokes: sql`${revokeStats.totalRevokes} + 1`,
          totalValueSecured: newTotal.toFixed(2)
        })
        .where(eq(revokeStats.id, existingStats.id));
    }
    
    return record;
  }

  async getRecentRevokes(limit: number = 10): Promise<RevokeHistory[]> {
    return db.select()
      .from(revokeHistory)
      .orderBy(sql`${revokeHistory.createdAt} DESC`)
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
