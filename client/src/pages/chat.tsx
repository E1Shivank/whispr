import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ChatInterface from "@/components/ChatInterface";

export default function Chat() {
  const { chatId } = useParams();

  const { data: chatLink, isLoading, error } = useQuery({
    queryKey: ["/api/chat-links", chatId],
    enabled: !!chatId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-white">Loading chat...</p>
          <p className="text-sm text-gray-400 mt-2">Verifying secure connection</p>
        </div>
      </div>
    );
  }

  if (error || !chatLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 glass-card border-gray-800">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2 items-center justify-center">
              <Shield className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-white">Chat Not Found</h1>
            </div>

            <p className="mt-4 text-sm text-gray-400 text-center mb-6">
              This chat link is invalid or has expired.
            </p>

            <div className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ChatInterface chatId={chatId!} />;
}
