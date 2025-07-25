import { Socket } from 'socket.io-client';
import { PerformanceMonitor, ConnectionQuality, StreamManager } from './performance';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private chatId: string | null = null;
  private isInitiator = false;
  private isCallActive = false;
  private performanceMonitor = PerformanceMonitor.getInstance();
  private connectionQuality = ConnectionQuality.getInstance();
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallEndCallback: (() => void) | null = null;

  constructor() {
    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle' as RTCBundlePolicy,
      rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.chatId) {
        this.socket.emit('ice-candidate', {
          chatId: this.chatId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      const trackStartTime = performance.now();
      console.log('Received remote stream');
      this.remoteStream = event.streams[0];
      StreamManager.addStream(this.remoteStream);
      
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
      
      this.performanceMonitor.measureLatency('remote_stream_received', trackStartTime);
      
      // Start monitoring connection quality
      this.monitorConnectionQuality();
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'disconnected' || 
          this.peerConnection?.connectionState === 'failed') {
        this.endCall();
      }
    };
  }

  setSocket(socket: Socket, chatId: string) {
    this.socket = socket;
    this.chatId = chatId;

    // Remove existing listeners to prevent duplicates
    this.socket.off('call-offer');
    this.socket.off('call-answer');
    this.socket.off('ice-candidate');
    this.socket.off('call-end');

    // Listen for WebRTC signaling events
    this.socket.on('call-offer', async (data: any) => {
      console.log('Received call offer');
      await this.handleCallOffer(data);
    });

    this.socket.on('call-answer', async (data: any) => {
      console.log('Received call answer');
      await this.handleCallAnswer(data);
    });

    this.socket.on('ice-candidate', (data: any) => {
      this.handleIceCandidate(data);
    });

    this.socket.on('call-end', () => {
      console.log('Call ended by remote peer');
      if (this.isCallActive) {
        this.endCall(false); // Don't emit call-end back
      }
    });
  }

  async startCall(isVideo: boolean = false): Promise<MediaStream> {
    try {
      console.log('Getting user media...');
      
      // Get user media with optimized settings for low latency
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { 
          width: { ideal: 640, max: 1280 }, 
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user'
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Got local stream:', this.localStream.getTracks().map(t => t.kind));
      StreamManager.addStream(this.localStream);

      // Add local stream to peer connection
      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          this.peerConnection!.addTrack(track, this.localStream!);
        });

        // Create offer
        console.log('Creating offer...');
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo
        });
        
        await this.peerConnection.setLocalDescription(offer);
        console.log('Local description set');

        // Send offer through socket
        if (this.socket && this.chatId) {
          this.isInitiator = true;
          this.isCallActive = true;
          console.log('Sending call offer...');
          this.socket.emit('call-offer', {
            chatId: this.chatId,
            offer: offer,
            callerId: this.socket.id,
            isVideo: isVideo
          });
        }
      }

      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      this.isInitiator = false;
      throw error;
    }
  }

  async answerCall(isVideo: boolean = false): Promise<MediaStream> {
    try {
      console.log('Getting user media for answer...');
      
      // Get user media with same constraints as offer
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Got local stream for answer:', this.localStream.getTracks().map(t => t.kind));
      StreamManager.addStream(this.localStream);

      // Add local stream to peer connection (this will be done in handleCallOffer)
      // We don't add tracks here to avoid duplicate tracks

      return this.localStream;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  private async handleCallOffer(data: any) {
    try {
      console.log('Handling call offer:', data);
      if (!this.peerConnection) return;

      console.log('Setting remote description...');
      await this.peerConnection.setRemoteDescription(data.offer);
      
      // Get user media and add tracks with optimized settings
      console.log('Getting user media for answer...');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: data.isVideo ? { 
          width: { ideal: 640, max: 1280 }, 
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user'
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Adding tracks to answer...');
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create answer
      console.log('Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer
      if (this.socket && this.chatId) {
        this.isCallActive = true;
        console.log('Sending answer...');
        this.socket.emit('call-answer', {
          chatId: this.chatId,
          answer: answer,
          callerId: data.callerId
        });
      }
    } catch (error) {
      console.error('Error handling call offer:', error);
    }
  }

  private async handleCallAnswer(data: any) {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Error handling call answer:', error);
    }
  }

  private async handleIceCandidate(data: any) {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  endCall(shouldNotifyRemote: boolean = true) {
    console.log('Ending call, shouldNotifyRemote:', shouldNotifyRemote);

    if (!this.isCallActive) {
      console.log('Call already ended');
      return;
    }

    this.isCallActive = false;

    // Stop local stream
    if (this.localStream) {
      StreamManager.removeStream(this.localStream);
      this.localStream = null;
    }

    // Stop remote stream
    if (this.remoteStream) {
      StreamManager.removeStream(this.remoteStream);
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.setupPeerConnection(); // Reset for next call
    }

    // Notify remote peer only if requested and we're active in the call
    if (shouldNotifyRemote && this.socket && this.chatId) {
      console.log('Notifying remote peer of call end');
      this.socket.emit('call-end', { chatId: this.chatId });
    }

    // Reset state
    this.remoteStream = null;
    this.isInitiator = false;

    // Call end callback
    if (this.onCallEndCallback) {
      this.onCallEndCallback();
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onCallEnd(callback: () => void) {
    this.onCallEndCallback = callback;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  isInCall() {
    return this.isCallActive;
  }

  private optimizeSDP(sdp: string): string {
    // Simple SDP optimization without problematic modifications
    return sdp;
  }

  private monitorConnectionQuality(): void {
    if (!this.peerConnection) return;
    
    const monitor = setInterval(async () => {
      if (!this.isCallActive || !this.peerConnection) {
        clearInterval(monitor);
        return;
      }
      
      await this.connectionQuality.assessConnection(this.peerConnection);
    }, 5000); // Check every 5 seconds
  }

  getConnectionQuality() {
    return this.connectionQuality.getQuality();
  }

  getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }
}