import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRevokeHistorySchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get revoke statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getRevokeStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Record a new revoke
  app.post("/api/revoke", async (req, res) => {
    try {
      const parsed = insertRevokeHistorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error });
      }
      
      const record = await storage.recordRevoke(parsed.data);
      res.json(record);
    } catch (error) {
      console.error("Error recording revoke:", error);
      res.status(500).json({ error: "Failed to record revoke" });
    }
  });

  // Get recent revokes
  app.get("/api/revokes/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const revokes = await storage.getRecentRevokes(limit);
      res.json(revokes);
    } catch (error) {
      console.error("Error fetching recent revokes:", error);
      res.status(500).json({ error: "Failed to fetch recent revokes" });
    }
  });

  return httpServer;
}
