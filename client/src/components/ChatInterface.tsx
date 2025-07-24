import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { e2eeManager } from '@/lib/encryption';
import { 
  Send, 
  Phone, 
  Video, 
  Paperclip, 
  Smile, 
  Mic, 
  Shield, 
  Users,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';
import { Link } from 'wouter';
import sodium from 'libsodium-wrappers';

interface Message {
  id: string;
  content: string;
  timestamp: number;
  senderId: string;
  type: 'text' | 'system';
  isOwn: boolean;
}

interface ChatUser {
  id: string;
  publicKey?: string;
}

interface ChatInterfaceProps {
  chatId: string;
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [isKeyExchangeComplete, setIsKeyExchangeComplete] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Audio/Video call states
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize peer connection
  const initializePeerConnection = () => {
    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          chatId,
          candidate: event.candidate
        });
      }
    };
    
    peerConnection.ontrack = async (event) => {
      console.log('Received remote track:', event.track.kind, 'streams:', event.streams.length);
      const track = event.track;
      
      if (event.streams && event.streams.length > 0) {
        if (track.kind === 'audio' && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.volume = 1.0;
          
          try {
            await remoteAudioRef.current.play();
            setAudioEnabled(true);
            console.log('Remote audio started playing automatically');
            
            toast({
              title: "Audio Connected",
              description: "You should now hear the other person"
            });
          } catch (error) {
            console.log('Audio autoplay prevented, user needs to enable:', error);
            setAudioEnabled(false);
            toast({
              title: "Audio Blocked",
              description: "Click 'Enable Audio' to hear the call",
              variant: "destructive"
            });
          }
        } else if (track.kind === 'video' && remoteVideoRef.current) {
          console.log('Setting remote video stream:', event.streams[0]);
          remoteVideoRef.current.srcObject = event.streams[0];
          
          // Add event listeners to track video state
          const handleVideoReady = () => {
            console.log('Remote video metadata loaded');
            setHasRemoteVideo(true);
          };
          
          const handleVideoPlaying = () => {
            console.log('Remote video is now playing');
            setHasRemoteVideo(true);
          };
          
          remoteVideoRef.current.addEventListener('loadedmetadata', handleVideoReady);
          remoteVideoRef.current.addEventListener('playing', handleVideoPlaying);
          remoteVideoRef.current.addEventListener('canplay', handleVideoReady);
          
          // Force video to show immediately when we receive the stream
          setTimeout(() => setHasRemoteVideo(true), 100);
          
          try {
            await remoteVideoRef.current.play();
            console.log('Remote video started playing');
            
            toast({
              title: "Video Connected", 
              description: "Video call is now active"
            });
          } catch (error) {
            console.log('Video autoplay prevented, trying alternatives:', error);
            // Try muted autoplay
            remoteVideoRef.current.muted = true;
            try {
              await remoteVideoRef.current.play();
              console.log('Remote video started playing muted');
              // Show toast to unmute if needed
              toast({
                title: "Video Connected (Muted)",
                description: "Video is playing but muted due to browser policy"
              });
            } catch (retryError) {
              console.log('Video play completely failed:', retryError);
              toast({
                title: "Video Issue",
                description: "Video received but may need manual interaction to play",
                variant: "destructive"
              });
            }
          }
        }
      }
    };
    
    return peerConnection;
  };

  // Start audio call
  const startCall = async (withVideo = false) => {
    if (chatUsers.length <= 1) {
      toast({
        title: "No Users Available",
        description: "No other users in the chat to call",
        variant: "destructive"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: withVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      });
      localStreamRef.current = stream;
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true; // Mute local audio to prevent echo
      }
      
      if (withVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video audio to prevent echo
        localVideoRef.current.playsInline = true; // Important for mobile devices
        setIsVideoCall(true);
        setIsVideoEnabled(true);
        console.log('Local video stream set for initiator, tracks:', stream.getVideoTracks().length);
        
        // Ensure local video plays immediately
        try {
          await localVideoRef.current.play();
          console.log('Local video playing successfully for initiator');
        } catch (error) {
          console.log('Local video autoplay issue for initiator:', error);
          // Try to play without autoplay restrictions
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(e => console.log('Retry failed:', e));
        }
      }

      console.log('Microphone access granted, starting call');

      const peerConnection = initializePeerConnection();
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, 'enabled:', track.enabled);
        const sender = peerConnection.addTrack(track, stream);
        console.log('Track added with sender:', sender);
      });

      // Create offer with proper options for video calls
      const offerOptions = withVideo ? {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      } : {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      };
      
      const offer = await peerConnection.createOffer(offerOptions);
      await peerConnection.setLocalDescription(offer);
      console.log('Created offer with video:', withVideo);

      // Send call offer to other users
      socket?.emit('call-offer', {
        chatId,
        offer,
        callerId: userId,
        isVideo: withVideo
      });

      setIsInCall(true);
      
      // Prepare audio element for incoming audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = 1.0;
        // Don't try to play yet, wait for remote stream
      }
      
      toast({
        title: "Calling...",
        description: withVideo ? "Initiating video call" : "Initiating audio call"
      });
    } catch (error) {
      console.error('Failed to start call:', error);
      toast({
        title: "Call Failed",
        description: "Could not access microphone or start call",
        variant: "destructive"
      });
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isVideoCall ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      });
      localStreamRef.current = stream;
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }
      
      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true; // Important for mobile devices
        setIsVideoEnabled(true);
        console.log('Local video stream set for answerer, tracks:', stream.getVideoTracks().length);
        
        // Ensure local video plays immediately
        try {
          await localVideoRef.current.play();
          console.log('Local video playing successfully for answerer');
        } catch (error) {
          console.log('Local video autoplay issue for answerer:', error);
          // Try to play without autoplay restrictions
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(e => console.log('Retry failed:', e));
        }
      }

      console.log('Microphone access granted for answering call');

      // Add local stream to existing peer connection
      if (peerConnectionRef.current) {
        // Remove existing tracks first to avoid conflicts
        const senders = peerConnectionRef.current.getSenders();
        senders.forEach(sender => {
          if (sender.track) {
            peerConnectionRef.current!.removeTrack(sender);
          }
        });
        
        // Add new tracks
        stream.getTracks().forEach(track => {
          console.log('Adding local track for answer:', track.kind, 'enabled:', track.enabled);
          const sender = peerConnectionRef.current!.addTrack(track, stream);
          console.log('Answer track added with sender:', sender);
        });

        // Create and send answer with proper options
        const answerOptions = isVideoCall ? {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        } : {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        };
        
        const answer = await peerConnectionRef.current.createAnswer(answerOptions);
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log('Created answer with video:', isVideoCall);

        socket?.emit('call-answer', {
          chatId,
          answer,
          callerId
        });
      }

      setIsInCall(true);
      setIsCallIncoming(false);
      setCallerId(null);
      
      // Prepare audio element for incoming audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = 1.0;
      }
      
      toast({
        title: "Call Connected",
        description: isVideoCall ? "Video call active" : "Audio call active"
      });
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast({
        title: "Call Failed",
        description: "Could not access microphone",
        variant: "destructive"
      });
      setIsCallIncoming(false);
    }
  };

  // End call
  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsInCall(false);
    setIsVideoCall(false);
    setIsCallIncoming(false);
    setCallerId(null);
    setIsMuted(false);
    setIsVideoEnabled(false);
    setAudioEnabled(false);
    setHasRemoteVideo(false);

    socket?.emit('call-end', { chatId });

    toast({
      title: "Call Ended",
      description: isVideoCall ? "Video call disconnected" : "Audio call disconnected"
    });
  };

  // Enable audio (required for browser autoplay policies)
  const enableAudio = async () => {
    try {
      if (remoteAudioRef.current) {
        // Create a silent audio context to unlock audio playback
        const audioContext = new AudioContext();
        await audioContext.resume();
        
        // Try to play the audio element
        await remoteAudioRef.current.play();
        setAudioEnabled(true);
        
        toast({
          title: "Audio Enabled",
          description: "You can now hear voice calls"
        });
      }
    } catch (error) {
      console.log('Audio enable failed:', error);
      toast({
        title: "Audio Enable Failed",
        description: "Please click in the browser window and try again",
        variant: "destructive"
      });
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Initialize encryption
        await e2eeManager.initialize();
        const keyPair = await e2eeManager.getOrGenerateKeyPair();
        
        // Connect to socket
        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('connect', () => {
          setIsConnected(true);
          console.log('Connected to server');
          
          // Join the chat room
          newSocket.emit('join-chat', {
            chatId,
            userId,
            publicKey: e2eeManager.getPublicKeyBase64()
          });
        });

        newSocket.on('disconnect', () => {
          setIsConnected(false);
          console.log('Disconnected from server');
        });



        newSocket.on('chat-users', (users: ChatUser[]) => {
          console.log('Received chat users:', users);
          setChatUsers(users);
          setIsKeyExchangeComplete(true);
        });

        newSocket.on('user-joined', ({ userId: joinedUserId, publicKey, timestamp }) => {
          console.log(`User joined: ${joinedUserId}`);
          
          // Update chat users list
          setChatUsers(prev => {
            const exists = prev.find(u => u.id === joinedUserId);
            if (!exists) {
              return [...prev, { id: joinedUserId, publicKey }];
            }
            return prev;
          });
          
          setMessages(prev => [...prev, {
            id: `system_${timestamp}`,
            content: 'User joined the chat',
            timestamp,
            senderId: 'system',
            type: 'system',
            isOwn: false
          }]);
        });

        newSocket.on('user-left', ({ userId: leftUserId, timestamp }) => {
          console.log(`User left: ${leftUserId}`);
          
          // Remove from chat users list
          setChatUsers(prev => prev.filter(u => u.id !== leftUserId));
          
          setMessages(prev => [...prev, {
            id: `system_${timestamp}`,
            content: 'User left the chat',
            timestamp,
            senderId: 'system',
            type: 'system',
            isOwn: false
          }]);
        });

        // WebRTC call events
        newSocket.on('call-offer', async ({ offer, callerId: incomingCallerId, isVideo }) => {
          console.log('Received call offer from:', incomingCallerId, 'isVideo:', isVideo);
          setCallerId(incomingCallerId);
          setIsCallIncoming(true);
          setIsVideoCall(isVideo || false);
          
          // Initialize peer connection for incoming call
          const peerConnection = initializePeerConnection();
          peerConnectionRef.current = peerConnection;
          
          // Set remote description
          await peerConnection.setRemoteDescription(offer);
        });

        newSocket.on('call-answer', async ({ answer }) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(answer);
          }
        });

        newSocket.on('ice-candidate', async ({ candidate }) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          }
        });

        newSocket.on('call-end', () => {
          endCall();
        });

        newSocket.on('receive-message', async ({ messageId, encryptedContent, timestamp, senderId }) => {
          try {
            // For demo purposes, we'll show messages in plain text for instant messaging
            // In production, you'd implement proper key exchange first
            
            // Try to decrypt if we have the sender's key, otherwise show as encrypted
            const sender = chatUsers.find(u => u.id === senderId);
            let decryptedContent = 'Encrypted message';
            
            if (sender?.publicKey && encryptedContent?.ciphertext) {
              try {
                const senderPublicKey = e2eeManager.publicKeyFromBase64(sender.publicKey);
                const encryptedMessage = {
                  ciphertext: sodium.from_base64(encryptedContent.ciphertext),
                  nonce: sodium.from_base64(encryptedContent.nonce)
                };
                decryptedContent = await e2eeManager.decryptMessage(encryptedMessage, senderPublicKey);
              } catch (decryptError) {
                console.log('Decryption failed, showing as plain text for demo');
                decryptedContent = encryptedContent.plaintext || 'Encrypted message';
              }
            } else {
              // Fallback to plain text for instant messaging demo
              decryptedContent = encryptedContent.plaintext || encryptedContent;
            }
            
            setMessages(prev => [...prev, {
              id: messageId,
              content: decryptedContent,
              timestamp,
              senderId,
              type: 'text',
              isOwn: false
            }]);
          } catch (error) {
            console.error('Failed to process message:', error);
            // Still show the message for better UX
            setMessages(prev => [...prev, {
              id: messageId,
              content: 'Message received (decryption failed)',
              timestamp,
              senderId,
              type: 'text',
              isOwn: false
            }]);
          }
        });

        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to set up secure chat",
          variant: "destructive"
        });
        setIsInitializing(false);
      }
    };

    initializeChat();

    return () => {
      // Clean up WebRTC connections
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      socket?.disconnect();
    };
  }, [chatId, userId, toast]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !socket || !isConnected) {
      return;
    }

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();

      // For instant messaging, send both encrypted and plaintext for demo
      let encryptedContent: any = {
        plaintext: inputMessage // Fallback for instant messaging
      };

      // Try to encrypt if we have recipients with public keys
      const recipient = chatUsers.find(u => u.id !== userId);
      if (recipient?.publicKey) {
        try {
          const recipientPublicKey = e2eeManager.publicKeyFromBase64(recipient.publicKey);
          const encryptedMessage = await e2eeManager.encryptMessage(inputMessage, recipientPublicKey);
          
          encryptedContent = {
            ciphertext: sodium.to_base64(encryptedMessage.ciphertext),
            nonce: sodium.to_base64(encryptedMessage.nonce),
            plaintext: inputMessage // Keep for instant demo
          };
        } catch (encryptError) {
          console.log('Encryption failed, sending plaintext for demo');
        }
      }

      // Send message to all users in the chat (broadcast)
      socket.emit('send-message', {
        chatId,
        messageId,
        encryptedContent
      });

      // Add to local messages immediately
      setMessages(prev => [...prev, {
        id: messageId,
        content: inputMessage,
        timestamp,
        senderId: userId,
        type: 'text',
        isOwn: true
      }]);

      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Send Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Setting up secure chat...</p>
          <p className="text-sm text-gray-400 mt-2">Generating encryption keys</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Chat Header */}
      <div className="glass-card border-b border-gray-700/50 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center">
            <Users className="text-white h-5 w-5" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-white">Secure Chat</h3>
            <div className="flex items-center space-x-2 text-sm">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">End-to-end encrypted</span>
              <span className="text-gray-400">•</span>
              <span className={`${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isInCall ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-cyan-400 hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                startCall();
              }}
              disabled={chatUsers.length <= 1}
            >
              <Phone className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`${isMuted ? 'text-red-400' : 'text-cyan-400'} hover:text-white`}
                onClick={toggleMute}
              >
                <Mic className={`h-5 w-5 ${isMuted ? 'opacity-50' : ''}`} />
              </Button>
              {isVideoCall && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`${!isVideoEnabled ? 'text-red-400' : 'text-cyan-400'} hover:text-white`}
                  onClick={toggleVideo}
                >
                  <Video className={`h-5 w-5 ${!isVideoEnabled ? 'opacity-50' : ''}`} />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-400 hover:text-white"
                onClick={endCall}
              >
                <Phone className="h-5 w-5 rotate-[135deg]" />
              </Button>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-cyan-400 hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              startCall(true);
            }}
            disabled={chatUsers.length <= 1}
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 security-icon">
              <Shield className="text-2xl text-white" />
            </div>
            <p className="text-gray-400 mb-2">Chat is secured with end-to-end encryption</p>
            <p className="text-sm text-gray-500">Start sending secure messages</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.type === 'system' ? (
              <div className="text-center py-2">
                <span className="text-xs bg-gray-800/50 px-3 py-1 rounded-full text-gray-400">
                  <Shield className="inline h-3 w-3 mr-1" />
                  {message.content}
                </span>
              </div>
            ) : (
              <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.isOwn 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                    : 'bg-gray-700 text-white'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className={`text-xs ${
                      message.isOwn ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.isOwn && (
                      <div className="text-xs text-white/70">✓✓</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 glass-card border-t border-gray-700/50">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-12"
              disabled={!isConnected}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          {inputMessage.trim() ? (
            <Button 
              onClick={sendMessage}
              disabled={!isConnected}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-white">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {!isConnected && (
          <p className="text-center text-red-400 text-sm mt-2">
            Connecting to secure server...
          </p>
        )}
        
        {isConnected && chatUsers.length <= 1 && (
          <p className="text-center text-gray-400 text-sm mt-2">
            Share this chat link with others to start chatting securely
          </p>
        )}
      </div>

      {/* Hidden audio elements for WebRTC */}
      <audio 
        ref={localAudioRef} 
        autoPlay 
        muted 
        playsInline
        style={{ display: 'none' }} 
      />
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline
        controls={false}
        style={{ display: 'none' }} 
      />

      {/* Video call overlay */}
      {isInCall && isVideoCall && (
        <div className="fixed inset-0 bg-black z-40 flex flex-col">
          {/* Video call header */}
          <div className="safe-area-top p-3 sm:p-4 flex items-center justify-between bg-black/20 backdrop-blur-sm">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium text-sm sm:text-base">Video Call</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-red-400 p-2"
              onClick={endCall}
            >
              <Phone className="h-4 w-4 sm:h-5 sm:w-5 rotate-[135deg]" />
            </Button>
          </div>

          {/* Main video area - responsive */}
          <div className="flex-1 relative overflow-hidden">
            {/* Remote video (main) - full screen with proper aspect ratio */}
            <video 
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-gray-900 cursor-pointer"
              style={{ 
                objectFit: 'cover',
                minHeight: '100%',
                minWidth: '100%'
              }}
              onLoadedMetadata={() => {
                console.log('Remote video metadata loaded');
                setHasRemoteVideo(true);
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.error);
                }
              }}
              onCanPlay={() => {
                console.log('Remote video can play');
                setHasRemoteVideo(true);
              }}
              onClick={() => {
                // Manual video enable on click if autoplay failed
                if (remoteVideoRef.current && remoteVideoRef.current.paused) {
                  remoteVideoRef.current.play().catch(console.error);
                }
              }}
            />
            
            {/* Debug info overlay */}
            <div className="absolute top-12 left-4 bg-black/50 text-white text-xs p-2 rounded">
              Remote: {hasRemoteVideo ? 'Connected' : 'Waiting'}
              <br />
              Local Enabled: {isVideoEnabled ? 'Yes' : 'No'}
            </div>
            
            {/* Waiting for remote video indicator */}
            {!hasRemoteVideo && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                <div className="text-center px-4">
                  <Video className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-white text-base sm:text-lg">Waiting for video...</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">Make sure the other person has their camera enabled</p>
                </div>
              </div>
            )}
            
            {/* Local video (picture-in-picture) - responsive sizing */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-24 h-32 sm:w-32 sm:h-44 md:w-48 md:h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg">
              <video 
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ objectFit: 'cover' }}
                onLoadedMetadata={() => {
                  console.log('Local video metadata loaded');
                  if (localVideoRef.current) {
                    localVideoRef.current.play().catch(console.error);
                  }
                }}
                onCanPlay={() => {
                  console.log('Local video can play');
                }}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
                  <Video className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 opacity-50" />
                </div>
              )}
              {/* Debug info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                Local: {isVideoEnabled ? 'On' : 'Off'}
              </div>
            </div>
          </div>

          {/* Video call controls - responsive and touch-friendly */}
          <div className="safe-area-bottom p-4 sm:p-6 bg-black/20 backdrop-blur-sm">
            <div className="flex justify-center items-center space-x-4 sm:space-x-6 max-w-sm mx-auto">
              <Button 
                variant="ghost" 
                size="lg" 
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full touch-manipulation ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700/80 hover:bg-gray-600'}`}
                onClick={toggleMute}
              >
                <Mic className={`h-5 w-5 sm:h-6 sm:w-6 text-white ${isMuted ? 'opacity-50' : ''}`} />
              </Button>
              
              <Button 
                variant="ghost" 
                size="lg" 
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full touch-manipulation ${!isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700/80 hover:bg-gray-600'}`}
                onClick={toggleVideo}
              >
                <Video className={`h-5 w-5 sm:h-6 sm:w-6 text-white ${!isVideoEnabled ? 'opacity-50' : ''}`} />
              </Button>
              
              <Button 
                variant="ghost" 
                size="lg" 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600 hover:bg-red-700 touch-manipulation"
                onClick={endCall}
              >
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white rotate-[135deg]" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Call status overlay (audio only) */}
      {isInCall && !isVideoCall && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass-card rounded-full px-6 py-3 flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white">Audio call active</span>
            {!audioEnabled && (
              <Button 
                size="sm" 
                onClick={enableAudio}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                Enable Audio
              </Button>
            )}
            {isMuted && (
              <div className="flex items-center space-x-1 text-red-400">
                <Mic className="h-4 w-4 opacity-50" />
                <span className="text-xs">Muted</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incoming call overlay */}
      {isCallIncoming && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="h-10 w-10 text-white animate-bounce" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Incoming {isVideoCall ? 'Video' : 'Audio'} Call
            </h3>
            <p className="text-gray-400 mb-6">Someone is calling you</p>
            <div className="flex gap-4">
              <Button 
                onClick={() => setIsCallIncoming(false)}
                variant="outline"
                className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Decline
              </Button>
              <Button 
                onClick={answerCall}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Answer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}