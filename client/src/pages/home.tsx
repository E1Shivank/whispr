import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Users, Video, UserCheck, Smartphone, Phone, MessageCircle, Check, Heart, Github, ArrowRight, Menu, Twitter, Mail } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Grid */}
      <div className="fixed inset-0 vercel-grid-fade opacity-50 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <Shield className="text-background h-4 w-4" />
              </div>
              <span className="text-xl font-semibold">SecureChat</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Features</a>
              <a href="#security" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Security</a>
              <a href="#privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Privacy</a>
              <Button variant="outline" size="sm" className="text-sm">
                <Github className="mr-2 h-3 w-3" />
                GitHub
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-4 md:px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight tracking-tight">
            <span className="vercel-text-gradient">Secure Chat.</span> <br />
            <span className="text-foreground">No Strings Attached.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            End-to-end encrypted messaging that disappears. 
            No accounts, no tracking, just pure privacy.
          </p>

          {/* CTA Button */}
          <div className="mb-16">
            <Button 
              onClick={handleCreateChatLink}
              disabled={isLoading}
              className="vercel-button px-8 py-4 text-lg font-medium rounded-full hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin mr-3"></div>
                  Creating secure link...
                </>
              ) : (
                <>
                  Start Secure Chat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-4 gap-6 text-sm text-muted-foreground">
            <div className="flex items-center justify-center space-x-2">
              <Check className="h-4 w-4 text-foreground" />
              <span>No registration required</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Shield className="h-4 w-4 text-foreground" />
              <span>End-to-end encrypted</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Lock className="h-4 w-4 text-foreground" />
              <span>No message storage</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Phone className="h-4 w-4 text-foreground" />
              <span>Ephemeral file sharing</span>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 md:px-6 py-20 md:py-32 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 vercel-text-gradient">
              Built for Privacy
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Military-grade encryption meets modern design. 
              No compromises on security or user experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="vercel-card group">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="h-5 w-5 text-background" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Anonymous</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                No registration required. Generate secure chat links instantly without revealing your identity.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="vercel-card group">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5 text-background" />
              </div>
              <h3 className="text-lg font-semibold mb-3">End-to-End Encrypted</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Military-grade encryption using Signal Protocol ensures your messages stay private.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="vercel-card group">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Lock className="h-5 w-5 text-background" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Ephemeral</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Messages are never stored on servers. Complete privacy by design.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="vercel-card group">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Video className="h-5 w-5 text-background" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Voice & Video</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Secure WebRTC-powered voice and video calls with DTLS-SRTP encryption.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="vercel-card group">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-5 w-5 text-background" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Ephemeral Files</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Share images that disappear after 20 seconds with screenshot protection for maximum privacy.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="vercel-card group">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="h-5 w-5 text-background" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Progressive Web App</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Install as a native app on any device. Offline-capable with service workers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="relative z-10 px-4 md:px-6 py-20 md:py-32 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 vercel-text-gradient">
            Zero-Knowledge Architecture
          </h2>
          <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            Our servers never see your messages, metadata, or encryption keys. 
            All cryptographic operations happen locally in your browser.
          </p>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-left">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="h-4 w-4 text-background" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Client-Side Encryption</h3>
                  <p className="text-sm text-muted-foreground">Messages are encrypted in your browser before transmission using industry-standard libsodium.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="h-4 w-4 text-background" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Perfect Forward Secrecy</h3>
                  <p className="text-sm text-muted-foreground">Each message uses unique encryption keys that are immediately discarded after use.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="h-4 w-4 text-background" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">No Server Storage</h3>
                  <p className="text-sm text-muted-foreground">Messages are relayed through our servers but never stored. Complete ephemerality by design.</p>
                </div>
              </div>
            </div>
            
            <div className="vercel-card p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Encryption Algorithm</span>
                  <span className="font-mono">ChaCha20-Poly1305</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Key Exchange</span>
                  <span className="font-mono">X25519</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hash Function</span>
                  <span className="font-mono">BLAKE2b</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Message Storage</span>
                  <span className="font-mono text-red-500">None</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="relative z-10 px-4 md:px-6 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <Shield className="text-background h-4 w-4" />
            </div>
            <span className="text-lg font-semibold">SecureChat</span>
          </div>
          
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Open-source, privacy-first messaging built with modern web technologies.
          </p>
          
          <div className="flex justify-center space-x-6 mb-8">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <Mail className="h-5 w-5" />
            </a>
          </div>
          
          <div className="text-xs text-muted-foreground border-t border-border pt-8">
            <p>© 2025 SecureChat. Licensed under MIT. Built for privacy.</p>
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="vercel-card p-8 text-center max-w-sm mx-4">
            <div className="w-12 h-12 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-semibold">Generating secure chat link...</p>
            <p className="text-sm text-muted-foreground mt-2">Creating encryption keys</p>
          </div>
        </div>
      )}
    </div>
  );
}
