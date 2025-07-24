import { chatLinks, type ChatLink, type InsertChatLink } from "@shared/schema";

export interface IStorage {
  createChatLink(chatLink: InsertChatLink): Promise<ChatLink>;
  getChatLink(chatId: string): Promise<ChatLink | undefined>;
}

export class MemStorage implements IStorage {
  private chatLinks: Map<string, ChatLink>;
  private currentId: number;

  constructor() {
    this.chatLinks = new Map();
    this.currentId = 1;
  }

  async createChatLink(insertChatLink: InsertChatLink): Promise<ChatLink> {
    const id = this.currentId++;
    const chatLink: ChatLink = {
      ...insertChatLink,
      id,
      createdAt: new Date(),
    };
    this.chatLinks.set(insertChatLink.chatId, chatLink);
    return chatLink;
  }

  async getChatLink(chatId: string): Promise<ChatLink | undefined> {
    return this.chatLinks.get(chatId);
  }
}

export const storage = new MemStorage();
