import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chatLinks = pgTable("chat_links", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatLinkSchema = createInsertSchema(chatLinks).pick({
  chatId: true,
});

export type InsertChatLink = z.infer<typeof insertChatLinkSchema>;
export type ChatLink = typeof chatLinks.$inferSelect;
