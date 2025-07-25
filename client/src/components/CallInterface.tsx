import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebRTCService } from '@/lib/webrtc';
import { RingtonePlayer } from './RingtonePlayer';

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

  const toggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  };

  const toggleVideo = () => {
    const videoOff = webrtcService.toggleVideo();
    setIsVideoOff(videoOff);
  };

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
              className="w-full h-full object-cover bg-gray-900"
              onLoadedMetadata={() => console.log('Remote video metadata loaded')}
              onPlay={() => console.log('Remote video playing')}
            />
            
            {/* Local video (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => console.log('Local video metadata loaded')}
                onPlay={() => console.log('Local video playing')}
              />
            </div>
            
            {/* Connection status overlay */}
            {!isConnected && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white text-lg">Connecting...</p>
                </div>
              </div>
            )}
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
                  <p className="text-gray-300 text-lg">
                    {formatDuration(callDuration)}
                  </p>
                )}
              </div>
            </div>
            
            {/* Hidden audio elements */}
            <audio ref={remoteVideoRef} autoPlay />
          </>
        )}
      </div>

      {/* Call status */}
      {isVideoCall && (
        <div className="absolute top-4 left-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-white text-sm">
              {isConnected ? formatDuration(callDuration) : 'Connecting...'}
            </p>
          </div>
        </div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-12 h-12"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          {isVideoCall && (
            <Button
              onClick={toggleVideo}
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-12 h-12"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}
          
          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}