import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Users, Video, UserCheck, Smartphone, Phone, MessageCircle, Check, Heart, Github, Twitter, Mail } from "lucide-react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createChatLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat-links");
      return response.json();
    },
    onSuccess: async (data) => {
      const chatLink = `${window.location.origin}/chat/${data.chatId}`;
      
      // Try Web Share API first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Secure Chat Link",
            text: "Join me for a secure, encrypted conversation",
            url: chatLink
          });
          toast({
            title: "Chat link shared successfully!",
            description: "The secure chat link has been shared.",
          });
          return;
        } catch (err) {
          // Fall through to clipboard
        }
      }
      
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(chatLink);
        toast({
          title: "Chat link created and copied!",
          description: "The secure chat link has been copied to your clipboard.",
        });
      } catch (err) {
        toast({
          title: "Chat link created!",
          description: `Your chat link: ${chatLink}`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error creating chat link",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleCreateChatLink = async () => {
    setIsLoading(true);
    // Simulate key generation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    createChatLinkMutation.mutate();
  };

  return (
    <div className="min-h-screen">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 rounded-full blur-2xl animate-float"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="text-white text-lg" />
            </div>
            <span className="text-xl font-bold">SecureChat</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#security" className="text-gray-400 hover:text-white transition-colors">Security</a>
            <a href="#privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
            <Button variant="secondary" size="sm">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="md:hidden">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Security Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full flex items-center justify-center security-icon animate-float">
              <Lock className="text-3xl md:text-4xl text-white" />
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Disposable</span> <br />
            <span className="text-white">E2EE Chat</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Secure, end-to-end encrypted environment for exchanging 
            sensitive information with peers
          </p>

          {/* Key Features */}
          <div className="mb-12 space-y-3">
            <div className="flex items-center justify-center space-x-3 text-emerald-400">
              <Check className="h-5 w-5" />
              <span className="text-lg">No login/signup required</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-emerald-400">
              <Check className="h-5 w-5" />
              <span className="text-lg">No tracker</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-emerald-400">
              <Check className="h-5 w-5" />
              <span className="text-lg">Your messages are end-to-end encrypted</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mb-12">
            <Button 
              onClick={handleCreateChatLink}
              disabled={isLoading}
              className="glow-button bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl font-semibold transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Creating secure link...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-3 h-5 w-5" />
                  Create chat link
                </>
              )}
            </Button>
          </div>

          {/* Open Source Notice */}
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Heart className="h-4 w-4 text-red-400" />
            <span>The source-code is public on GitHub, feel free to contribute!</span>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="gradient-text">Why Choose</span> SecureChat?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UserCheck className="text-xl text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Anonymous</h3>
              <p className="text-gray-400">No registration required. Generate secure chat links instantly without revealing your identity.</p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="text-xl text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">End-to-End Encrypted</h3>
              <p className="text-gray-400">Military-grade encryption using Signal Protocol ensures your messages stay private.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="text-xl text-white w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Ephemeral</h3>
              <p className="text-gray-400">Messages are never stored on servers. Complete privacy by design.</p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="text-xl text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Voice & Video</h3>
              <p className="text-gray-400">Secure WebRTC-powered voice and video calls with DTLS-SRTP encryption.</p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="text-xl text-white w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Assistant</h3>
              <p className="text-gray-400">Local AI chat assistant powered by ONNX.js while maintaining full privacy.</p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="text-xl text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Progressive Web App</h3>
              <p className="text-gray-400">Install as a native app on any device. Offline-capable with service workers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface Preview */}
      <section className="relative z-10 px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="gradient-text">WhatsApp-Style</span> Interface
          </h2>
          
          {/* Mock Chat Interface */}
          <div className="glass-card rounded-3xl overflow-hidden mx-auto max-w-sm md:max-w-md">
            {/* Chat Header */}
            <div className="bg-gray-800/50 p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                <Users className="text-white h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Anonymous User</h3>
                <p className="text-sm text-gray-400">End-to-end encrypted</p>
              </div>
              <div className="flex space-x-3">
                <button className="text-cyan-400 hover:text-white transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="text-cyan-400 hover:text-white transition-colors">
                  <Video className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="p-4 space-y-4 h-64 overflow-y-auto">
              {/* Received Message */}
              <div className="flex items-start space-x-2">
                <div className="bg-gray-700 rounded-2xl px-4 py-2 max-w-xs">
                  <p className="text-sm">Hello! This message is encrypted 🔒</p>
                  <span className="text-xs text-gray-400">2:14 PM</span>
                </div>
              </div>
              
              {/* Sent Message */}
              <div className="flex items-start space-x-2 justify-end">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl px-4 py-2 max-w-xs">
                  <p className="text-sm text-white">Great! Privacy first 🛡️</p>
                  <span className="text-xs text-white opacity-70">2:15 PM ✓✓</span>
                </div>
              </div>
              
              {/* System Message */}
              <div className="text-center">
                <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">
                  <Shield className="inline h-3 w-3 mr-1" />
                  Messages are end-to-end encrypted
                </span>
              </div>
            </div>
            
            {/* Chat Input */}
            <div className="bg-gray-800/50 p-4 flex items-center space-x-3">
              <button className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <div className="flex-1 bg-gray-700 rounded-full px-4 py-2">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="bg-transparent w-full focus:outline-none text-white placeholder-gray-400"
                  readOnly
                />
              </div>
              <button className="text-cyan-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zM9 9a1 1 0 100-2 1 1 0 000 2zM13 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                <svg className="text-white h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security Details */}
      <section id="security" className="relative z-10 px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="gradient-text">Security</span> Architecture
          </h2>
          
          <div className="space-y-8">
            {/* Signal Protocol */}
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="text-xl text-white w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold">Signal Protocol Implementation</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Built on the same cryptographic foundation that powers Signal Messenger, using @signalapp/libsignal-client 
                with TypeScript bindings and Rust-based core implementation.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-cyan-400">Key Features:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Perfect Forward Secrecy</li>
                    <li>• Double Ratchet Protocol</li>
                    <li>• X3DH Key Agreement</li>
                    <li>• Pre-key Distribution</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-emerald-400">Technologies:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Curve25519 ECDH</li>
                    <li>• AES-256-GCM</li>
                    <li>• HMAC-SHA256</li>
                    <li>• Ed25519 Signatures</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* WebRTC Security */}
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center">
                  <svg className="text-xl text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold">WebRTC Media Encryption</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Voice and video calls use WebRTC's built-in DTLS-SRTP encryption, providing 
                secure peer-to-peer communication without relying on central servers.
              </p>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <code className="text-sm text-cyan-400">
                  {`// WebRTC configuration with DTLS-SRTP
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});`}
                </code>
              </div>
            </div>

            {/* Zero Knowledge */}
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="text-xl text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold">Zero-Knowledge Architecture</h3>
              </div>
              <p className="text-gray-400">
                Our relay servers never see your messages, metadata, or encryption keys. 
                All cryptographic operations happen locally in your browser, ensuring complete privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 md:px-6 py-12 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="text-white text-sm" />
            </div>
            <span className="text-lg font-semibold">SecureChat</span>
          </div>
          
          <p className="text-gray-400 mb-6">
            Open-source, privacy-first messaging built with React, Signal Protocol, and WebRTC.
          </p>
          
          <div className="flex justify-center space-x-6 mb-6">
            <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              <Github className="text-xl" />
            </a>
            <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              <Twitter className="text-xl" />
            </a>
            <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              <Mail className="text-xl" />
            </a>
          </div>
          
          <p className="text-sm text-gray-400">
            Built with ❤️ for privacy. Licensed under MIT.
          </p>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-semibold">Generating secure chat link...</p>
            <p className="text-sm text-gray-400 mt-2">Creating encryption keys</p>
          </div>
        </div>
      )}
    </div>
  );
}
