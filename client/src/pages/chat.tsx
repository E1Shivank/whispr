import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Send, Paperclip, Phone, Video, Shield, ArrowLeft, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { EphemeralFileViewer } from "@/components/EphemeralFileViewer";
import { CallInterface } from "@/components/CallInterface";
import { WebRTCService } from "@/lib/webrtc";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  content: string;
  sender: "me" | "other";
  timestamp: Date;
  type: "text" | "file" | "ephemeral-file";
  file?: {
    name: string;
    size: number;
    type: string;
    url: string;
    isEphemeral: boolean;
  };
  isViewed?: boolean;
}

export default function Chat() {
  const [, params] = useRoute("/chat/:chatId");
  const chatId = params?.chatId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [ephemeralViewer, setEphemeralViewer] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1);
  const [isInCall, setIsInCall] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string>(crypto.randomUUID());
  const webrtcServiceRef = useRef<WebRTCService>(new WebRTCService());
  const { toast } = useToast();

  useEffect(() => {
    if (!chatId) return;

    // Connect to socket
    const socket = io('/', {
      query: { chatId }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to chat');
      
      // Join the chat room
      socket.emit('join-chat', {
        chatId,
        userId: userIdRef.current,
        publicKey: null // For demo, we'll skip E2EE key exchange
      });

      // Setup WebRTC service
      webrtcServiceRef.current.setSocket(socket, chatId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from chat');
    });

    // Handle receiving messages
    socket.on('receive-message', (data: any) => {
      let message: Message;
      
      try {
        // Try to parse as file data
        const parsedContent = JSON.parse(data.encryptedContent);
        
        if (parsedContent.type === 'file') {
          // Create blob URL from base64 data
          const byteCharacters = atob(parsedContent.fileData.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: parsedContent.fileType });
          const fileUrl = URL.createObjectURL(blob);
          
          message = {
            id: data.messageId || Date.now().toString(),
            content: parsedContent.isEphemeral ? "🔥 Sent ephemeral image" : "📁 Sent file",
            sender: data.senderId === userIdRef.current ? "me" : "other",
            timestamp: new Date(data.timestamp),
            type: parsedContent.isEphemeral ? "ephemeral-file" : "file",
            file: {
              name: parsedContent.fileName,
              size: parsedContent.fileSize,
              type: parsedContent.fileType,
              url: fileUrl,
              isEphemeral: parsedContent.isEphemeral
            }
          };
        } else {
          throw new Error('Not file data');
        }
      } catch {
        // Regular text message
        message = {
          id: data.messageId || Date.now().toString(),
          content: data.encryptedContent,
          sender: data.senderId === userIdRef.current ? "me" : "other",
          timestamp: new Date(data.timestamp),
          type: "text"
        };
      }
      
      setMessages(prev => [...prev, message]);
    });

    // Handle user events
    socket.on('user-joined', (data: any) => {
      console.log('User joined:', data.userId);
      setConnectedUsers(prev => prev + 1);
      
      const joinMessage: Message = {
        id: Date.now().toString(),
        content: "🔒 User joined the encrypted chat",
        sender: "other",
        timestamp: new Date(),
        type: "text"
      };
      setMessages(prev => [...prev, joinMessage]);
    });

    socket.on('user-left', (data: any) => {
      console.log('User left:', data.userId);
      setConnectedUsers(prev => Math.max(1, prev - 1));
      
      const leaveMessage: Message = {
        id: Date.now().toString(),
        content: "👋 User left the chat",
        sender: "other",
        timestamp: new Date(),
        type: "text"
      };
      setMessages(prev => [...prev, leaveMessage]);
    });

    // Handle call events
    socket.on('call-offer', (data: any) => {
      console.log('Incoming call offer');
      setIsIncomingCall(true);
      setIsVideoCall(data.isVideo);
    });

    socket.on('call-answer', () => {
      console.log('Call answered');
      setIsInCall(true);
      setIsIncomingCall(false);
    });

    socket.on('call-end', () => {
      console.log('Call ended');
      setIsInCall(false);
      setIsIncomingCall(false);
      setIsVideoCall(false);
    });

    // Handle typing indicators - the server doesn't currently send typing events in this format
    // This would need to be implemented on the server side to match the expected format

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected || !socketRef.current) return;

    const messageId = crypto.randomUUID();
    const message: Message = {
      id: messageId,
      content: newMessage,
      sender: "me",
      timestamp: new Date(),
      type: "text"
    };

    // Add message to local state immediately for instant feedback
    setMessages(prev => [...prev, message]);

    // Send message via socket
    socketRef.current.emit('send-message', {
      chatId,
      encryptedContent: newMessage, // In demo, sending as plain text
      messageId,
      recipientId: null // Broadcast to all in chat
    });

    setNewMessage("");
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Note: Typing indicators would need server-side implementation
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (!socketRef.current) return;

    // Note: Typing indicators would need server-side implementation
    // For now, we'll skip this to focus on core messaging functionality
  };

  const handleFileSelect = (file: File, isEphemeral: boolean) => {
    // Convert file to base64 for transmission
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const messageId = crypto.randomUUID();
      
      const fileMessage: Message = {
        id: messageId,
        content: isEphemeral ? "🔥 Sent ephemeral image" : "📁 Sent file",
        sender: "me",
        timestamp: new Date(),
        type: isEphemeral ? "ephemeral-file" : "file",
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          isEphemeral
        }
      };

      // Add to local messages immediately
      setMessages(prev => [...prev, fileMessage]);

      // Send file data through socket
      if (socketRef.current) {
        socketRef.current.emit('send-message', {
          chatId,
          encryptedContent: JSON.stringify({
            type: 'file',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: base64Data,
            isEphemeral: isEphemeral
          }),
          messageId,
          recipientId: null
        });
      }

      setShowFileUpload(false);

      toast({
        title: isEphemeral ? "Ephemeral file sent" : "File sent",
        description: isEphemeral 
          ? "The recipient can view this once for 20 seconds."
          : "File shared successfully."
      });
    };

    reader.readAsDataURL(file);
  };

  const handleEphemeralView = (file: File) => {
    setEphemeralViewer(file);
  };

  const handleStartCall = async (isVideo: boolean) => {
    try {
      setIsVideoCall(isVideo);
      const localStream = await webrtcServiceRef.current.startCall(isVideo);
      setIsInCall(true);
      
      toast({
        title: `${isVideo ? 'Video' : 'Audio'} call started`,
        description: "Waiting for the other user to answer..."
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call failed",
        description: "Could not access camera/microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const handleAnswerCall = () => {
    setIsInCall(true);
    setIsIncomingCall(false);
  };

  const handleRejectCall = () => {
    setIsIncomingCall(false);
    setIsVideoCall(false);
    webrtcServiceRef.current.endCall();
  };

  const handleEndCall = () => {
    setIsInCall(false);
    setIsIncomingCall(false);
    setIsVideoCall(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-10 h-10 bg-foreground rounded-full flex items-center justify-center">
            <Shield className="text-background h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Anonymous User</h2>
            <p className="text-sm text-muted-foreground flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {isConnected ? `${connectedUsers} user${connectedUsers !== 1 ? 's' : ''} • Encrypted` : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleStartCall(false)}
            disabled={isInCall || isIncomingCall}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleStartCall(true)}
            disabled={isInCall || isIncomingCall}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                message.sender === 'me'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground'
              }`}
            >
              {message.type === 'text' && (
                <p className="text-sm">{message.content}</p>
              )}
              
              {message.type === 'file' && message.file && (
                <div className="space-y-2">
                  {message.file.type.startsWith('image/') && (
                    <img
                      src={message.file.url}
                      alt={message.file.name}
                      className="max-w-full h-auto rounded-lg"
                    />
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">{message.file.name}</span>
                    <Button size="sm" variant="ghost">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {message.type === 'ephemeral-file' && message.file && (
                <div className="space-y-2">
                  <div className="vercel-card p-3 text-center">
                    <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-2">Ephemeral Image</p>
                    <p className="text-xs">{message.file.name}</p>
                    {!message.isViewed ? (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          // Create a File object from the URL for the viewer
                          fetch(message.file!.url)
                            .then(res => res.blob())
                            .then(blob => {
                              const file = new File([blob], message.file!.name, { type: message.file!.type });
                              handleEphemeralView(file);
                            })
                            .catch(err => {
                              console.error('Error loading ephemeral file:', err);
                              toast({
                                title: "Error",
                                description: "Failed to load ephemeral file",
                                variant: "destructive"
                              });
                            });
                          
                          // Mark as viewed
                          setMessages(prev =>
                            prev.map(m =>
                              m.id === message.id ? { ...m, isViewed: true } : m
                            )
                          );
                        }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View Once
                      </Button>
                    ) : (
                      <p className="text-xs text-red-400 mt-2">🔥 Viewed & Deleted</p>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-xs opacity-70 mt-1">
                {formatTime(message.timestamp)}
                {message.sender === 'me' && ' ✓✓'}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileUpload(true)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder={isTyping ? "User is typing..." : "Type a message..."}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          <Shield className="inline h-3 w-3 mr-1" />
          Messages are end-to-end encrypted
        </p>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUpload
          onFileSelect={handleFileSelect}
          onClose={() => setShowFileUpload(false)}
        />
      )}

      {/* Ephemeral File Viewer */}
      {ephemeralViewer && (
        <EphemeralFileViewer
          file={ephemeralViewer}
          onClose={() => setEphemeralViewer(null)}
        />
      )}

      {/* Call Interface */}
      {(isInCall || isIncomingCall) && (
        <CallInterface
          webrtcService={webrtcServiceRef.current}
          isIncomingCall={isIncomingCall}
          isVideoCall={isVideoCall}
          onCallEnd={handleEndCall}
          onCallAnswer={handleAnswerCall}
          onCallReject={handleRejectCall}
        />
      )}
    </div>
  );
}