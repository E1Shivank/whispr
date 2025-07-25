import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebRTCService } from '@/lib/webrtc';
import { RingtonePlayer } from './RingtonePlayer';
import { throttle } from '@/lib/performance';

interface CallInterfaceProps {
  webrtcService: WebRTCService;
  isIncomingCall: boolean;
  isVideoCall: boolean;
  onCallEnd: () => void;
  onCallAnswer: () => void;
  onCallReject: () => void;
}

export function CallInterface({ 
  webrtcService, 
  isIncomingCall, 
  isVideoCall, 
  onCallEnd, 
  onCallAnswer, 
  onCallReject 
}: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Set up remote stream handler
    webrtcService.onRemoteStream((stream) => {
      console.log('Received remote stream');
      setIsRinging(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(e => console.log('Remote video play error:', e));
        setIsConnected(true);
        startCallTimer();
        console.log('Remote stream connected');
      }
    });

    // Set up call end handler
    webrtcService.onCallEnd(() => {
      console.log('Call ended callback triggered');
      setIsConnected(false);
      setIsRinging(false);
      stopCallTimer();
      onCallEnd();
    });

    // Start ringing for incoming calls
    if (isIncomingCall) {
      setIsRinging(true);
    }

    // Set up local stream for calls that are already in progress
    if (!isIncomingCall && isVideoCall) {
      const localStream = webrtcService.getLocalStream();
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
        console.log('Local stream set to video element');
      }
    }

    return () => {
      stopCallTimer();
      setIsRinging(false);
    };
  }, [webrtcService, onCallEnd, isIncomingCall, isVideoCall]);

  const startCallTimer = () => {
    callStartTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
  };

  const stopCallTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCallDuration(0);
  };

  const handleAnswerCall = async () => {
    try {
      console.log(`Answering ${isVideoCall ? 'video' : 'audio'} call...`);
      setIsRinging(false);
      
      const localStream = await webrtcService.answerCall(isVideoCall);
      
      if (localVideoRef.current && isVideoCall && localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
        console.log('Local video stream set for answered call');
      }
      
      onCallAnswer();
    } catch (error) {
      console.error('Error answering call:', error);
      setIsRinging(false);
      onCallReject();
    }
  };

  const handleEndCall = () => {
    console.log('Handling end call in UI');
    webrtcService.endCall(true); // Notify remote peer
    stopCallTimer();
    onCallEnd();
  };



  // Throttled control functions for better performance
  const toggleMute = useCallback(throttle(() => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  }, 100), [webrtcService]);

  const toggleVideo = useCallback(throttle(() => {
    const videoOff = webrtcService.toggleVideo();
    setIsVideoOff(videoOff);
  }, 100), [webrtcService]);

  // Monitor connection quality
  useEffect(() => {
    if (!isConnected) return;
    
    const qualityMonitor = setInterval(() => {
      const quality = webrtcService.getConnectionQuality();
      setConnectionQuality(quality);
    }, 3000);

    return () => clearInterval(qualityMonitor);
  }, [isConnected, webrtcService]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isIncomingCall) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="vercel-card max-w-md w-full mx-4 text-center">
          <div className={`w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 ${isRinging ? 'animate-pulse' : ''}`}>
            {isVideoCall ? (
              <Video className="h-10 w-10 text-white" />
            ) : (
              <Phone className="h-10 w-10 text-white" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            Incoming {isVideoCall ? 'Video' : 'Audio'} Call
          </h3>
          
          <p className="text-muted-foreground mb-2">
            Anonymous user wants to {isVideoCall ? 'video' : 'voice'} chat with you
          </p>
          
          {isRinging && (
            <p className="text-green-400 text-sm mb-4 animate-pulse">
              📞 Ringing...
            </p>
          )}
          
          <div className="flex space-x-4">
            <Button
              onClick={onCallReject}
              variant="destructive"
              className="flex-1"
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              onClick={handleAnswerCall}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Phone className="mr-2 h-4 w-4" />
              Answer
            </Button>
          </div>
        </div>
        
        {/* Ringtone for incoming calls */}
        <RingtonePlayer isPlaying={isRinging} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Video containers */}
      <div className="flex-1 relative">
        {isVideoCall ? (
          <>
            {/* Remote video (main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover bg-gray-900 transition-opacity duration-300"
              style={{ opacity: isConnected ? 1 : 0.5 }}
              onLoadedMetadata={() => console.log('Remote video metadata loaded')}
              onPlay={() => console.log('Remote video playing')}
              onCanPlay={() => setIsConnected(true)}
            />
            
            {/* Local video (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20 transition-all duration-300 hover:scale-105">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => console.log('Local video metadata loaded')}
                onPlay={() => console.log('Local video playing')}
              />
              {/* Connection quality indicator */}
              <div className="absolute top-1 left-1">
                <div className={`w-2 h-2 rounded-full ${
                  connectionQuality === 'excellent' ? 'bg-green-400' :
                  connectionQuality === 'good' ? 'bg-yellow-400' :
                  connectionQuality === 'fair' ? 'bg-orange-400' : 'bg-red-400'
                }`} />
              </div>
            </div>
            
            {/* Connection status overlay with smooth transition */}
            <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-500 ${isConnected ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white text-lg">Connecting...</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Audio call interface */}
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Volume2 className="h-16 w-16 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  {isConnected ? 'Call in Progress' : 'Connecting...'}
                </h2>
                {isConnected && (
                  <div className="text-center">
                    <p className="text-gray-300 text-lg mb-2">
                      {formatDuration(callDuration)}
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <Wifi className={`w-4 h-4 ${
                        connectionQuality === 'excellent' ? 'text-green-400' :
                        connectionQuality === 'good' ? 'text-yellow-400' :
                        connectionQuality === 'fair' ? 'text-orange-400' : 'text-red-400'
                      }`} />
                      <span className="text-gray-400 text-sm capitalize">{connectionQuality}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Hidden audio elements */}
            <audio ref={remoteVideoRef} autoPlay />
          </>
        )}
      </div>

      {/* Call status with connection quality */}
      {isVideoCall && (
        <div className="absolute top-4 left-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <p className="text-white text-sm">
                {isConnected ? formatDuration(callDuration) : 'Connecting...'}
              </p>
              {isConnected && (
                <Wifi className={`w-3 h-3 ${
                  connectionQuality === 'excellent' ? 'text-green-400' :
                  connectionQuality === 'good' ? 'text-yellow-400' :
                  connectionQuality === 'fair' ? 'text-orange-400' : 'text-red-400'
                }`} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call controls with smooth animations */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4 bg-black/70 backdrop-blur-md rounded-full px-6 py-4 shadow-2xl">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          {isVideoCall && (
            <Button
              onClick={toggleVideo}
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}
          
          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 active:scale-95 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}