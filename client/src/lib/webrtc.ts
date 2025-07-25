import { Socket } from 'socket.io-client';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private chatId: string | null = null;
  private isInitiator = false;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallEndCallback: (() => void) | null = null;

  constructor() {
    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
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
      console.log('Received remote stream');
      this.remoteStream = event.streams[0];
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
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
      this.endCall();
    });
  }

  async startCall(isVideo: boolean = false): Promise<MediaStream> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });

      // Add local stream to peer connection
      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });

        // Create offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Send offer through socket
        if (this.socket && this.chatId) {
          this.isInitiator = true;
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
      throw error;
    }
  }

  async answerCall(isVideo: boolean = false): Promise<MediaStream> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });

      // Add local stream to peer connection
      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      return this.localStream;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  private async handleCallOffer(data: any) {
    try {
      if (!this.peerConnection) return;

      await this.peerConnection.setRemoteDescription(data.offer);
      
      // Get user media and add tracks
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: data.isVideo,
        audio: true
      });

      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer
      if (this.socket && this.chatId) {
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

  endCall() {
    console.log('Ending call');

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.setupPeerConnection(); // Reset for next call
    }

    // Notify remote peer
    if (this.socket && this.chatId) {
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

  isCallActive() {
    return this.peerConnection?.connectionState === 'connected' || 
           this.peerConnection?.connectionState === 'connecting';
  }
}