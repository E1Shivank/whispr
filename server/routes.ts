import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertChatLinkSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";

interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

interface ChatUser {
  id: string;
  socketId: string;
  chatId: string;
  publicKey?: string;
}

// In-memory storage for active chats (ephemeral)
const activeChatUsers = new Map<string, ChatUser[]>();
const userSockets = new Map<string, string>(); // userId -> socketId

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate a new chat link
  app.post("/api/chat-links", async (req, res) => {
    try {
      // Generate a secure random chat ID
      const chatId = randomBytes(16).toString('hex');
      
      const validatedData = insertChatLinkSchema.parse({ chatId });
      const chatLink = await storage.createChatLink(validatedData);
      
      res.json(chatLink);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get chat link by ID
  app.get("/api/chat-links/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const chatLink = await storage.getChatLink(chatId);
      
      if (!chatLink) {
        res.status(404).json({ message: "Chat link not found" });
        return;
      }
      
      res.json(chatLink);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // WebSocket handling for real-time chat
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a chat room
    socket.on("join-chat", ({ chatId, userId, publicKey }) => {
      socket.join(chatId);
      
      // Store user info
      const user: ChatUser = {
        id: userId,
        socketId: socket.id,
        chatId,
        publicKey
      };

      // Add user to chat
      if (!activeChatUsers.has(chatId)) {
        activeChatUsers.set(chatId, []);
      }
      const chatUsers = activeChatUsers.get(chatId)!;
      
      // Remove any existing user with same ID
      const existingIndex = chatUsers.findIndex(u => u.id === userId);
      if (existingIndex !== -1) {
        chatUsers.splice(existingIndex, 1);
      }
      
      chatUsers.push(user);
      userSockets.set(userId, socket.id);

      // Notify other users in the chat
      socket.to(chatId).emit("user-joined", {
        userId,
        publicKey,
        timestamp: Date.now()
      });

      // Send current users to the new joiner
      socket.emit("chat-users", chatUsers.map(u => ({
        id: u.id,
        publicKey: u.publicKey
      })));

      console.log(`User ${userId} joined chat ${chatId}`);
    });

    // Handle encrypted messages
    socket.on("send-message", ({ chatId, encryptedContent, recipientId, messageId }) => {
      const timestamp = Date.now();
      
      // Find the user who sent the message
      const senderUser = Array.from(activeChatUsers.entries())
        .find(([, users]) => users.some((u: ChatUser) => u.socketId === socket.id))?.[1]
        ?.find((u: ChatUser) => u.socketId === socket.id);
      
      const senderId = senderUser?.id || socket.id;
      
      // Broadcast to all users in chat except sender for instant messaging
      socket.to(chatId).emit("receive-message", {
        messageId,
        encryptedContent,
        timestamp,
        senderId
      });
      
      console.log(`Message sent in chat ${chatId} by ${senderId}`);
    });

    // Handle key exchange for E2EE
    socket.on("key-exchange", ({ chatId, recipientId, keyBundle }) => {
      const recipientSocketId = userSockets.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("key-exchange", {
          senderId: socket.id,
          keyBundle
        });
      }
    });

    // Handle WebRTC signaling for voice/video calls
    socket.on("call-offer", ({ chatId, offer, callerId, isVideo }) => {
      socket.to(chatId).emit("call-offer", {
        offer,
        callerId,
        isVideo
      });
      console.log(`${isVideo ? 'Video' : 'Audio'} call offer from ${callerId} in chat ${chatId}`);
    });

    socket.on("call-answer", ({ chatId, answer, callerId }) => {
      socket.to(chatId).emit("call-answer", {
        answer,
        callerId
      });
      console.log(`Call answered in chat ${chatId}`);
    });

    socket.on("ice-candidate", ({ chatId, candidate }) => {
      socket.to(chatId).emit("ice-candidate", {
        candidate
      });
    });

    socket.on("call-end", ({ chatId }) => {
      socket.to(chatId).emit("call-end");
      console.log(`Call ended in chat ${chatId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Remove user from active chats
      for (const [chatId, users] of Array.from(activeChatUsers.entries())) {
        const userIndex = users.findIndex((u: ChatUser) => u.socketId === socket.id);
        if (userIndex !== -1) {
          const user = users[userIndex];
          users.splice(userIndex, 1);
          userSockets.delete(user.id);
          
          // Notify other users and end any calls
          socket.to(chatId).emit("user-left", {
            userId: user.id,
            timestamp: Date.now()
          });
          
          socket.to(chatId).emit("call-end");
          
          // Clean up empty chats
          if (users.length === 0) {
            activeChatUsers.delete(chatId);
          }
          break;
        }
      }
    });
  });

  return httpServer;
}
