import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: 'text' | 'file' | 'ephemeral-file';
  file?: {
    name: string;
    size: number;
    type: string;
    url: string;
    isEphemeral: boolean;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private currentChatId: string | null = null;

  connect(chatId: string) {
    if (this.socket && this.currentChatId === chatId) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('/', {
      query: { chatId }
    });

    this.currentChatId = chatId;
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentChatId = null;
    }
  }

  sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    if (this.socket && this.currentChatId) {
      this.socket.emit('message', {
        ...message,
        chatId: this.currentChatId,
        id: crypto.randomUUID(),
        timestamp: new Date()
      });
    }
  }

  onMessage(callback: (message: ChatMessage) => void) {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  }

  onUserJoined(callback: (data: { userId: string; userCount: number }) => void) {
    if (this.socket) {
      this.socket.on('user-joined', callback);
    }
  }

  onUserLeft(callback: (data: { userId: string; userCount: number }) => void) {
    if (this.socket) {
      this.socket.on('user-left', callback);
    }
  }

  onTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on('typing', callback);
    }
  }

  sendTyping(isTyping: boolean) {
    if (this.socket && this.currentChatId) {
      this.socket.emit('typing', {
        chatId: this.currentChatId,
        isTyping
      });
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();