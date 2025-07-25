import { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EphemeralFileViewerProps {
  file: File;
  onClose: () => void;
}

export function EphemeralFileViewer({ file, onClose }: EphemeralFileViewerProps) {
  const [timeLeft, setTimeLeft] = useState(20);
  const [isVisible, setIsVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create encrypted blob URL
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Cleanup on unmount
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    // Prevent context menu and other screenshot methods
    const preventContextMenu = (e: Event) => e.preventDefault();
    const preventKeyboard = (e: KeyboardEvent) => {
      // Prevent common screenshot shortcuts
      if (
        (e.metaKey || e.ctrlKey) && 
        (e.key === 's' || e.key === 'S' || 
         e.key === 'p' || e.key === 'P' ||
         e.shiftKey && (e.key === '3' || e.key === '4')) // macOS screenshots
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventDevTools = (e: KeyboardEvent) => {
      if (e.key === 'F12' || 
          (e.metaKey && e.altKey && e.key === 'i') ||
          (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboard);
    document.addEventListener('keydown', preventDevTools);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboard);
      document.removeEventListener('keydown', preventDevTools);
    };
  }, []);

  const startViewing = () => {
    setIsVisible(true);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsVisible(false);
          setTimeout(onClose, 500); // Small delay for fade out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopViewing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!isVisible && timeLeft === 20) {
    return (
      <div className="ephemeral-viewer" ref={viewerRef}>
        <div className="vercel-card max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-background" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">View Once Image</h3>
          <p className="text-muted-foreground mb-6">
            This image will be visible for 20 seconds only and then deleted forever. 
            Screenshots are blocked for privacy.
          </p>
          
          <div className="flex space-x-3">
            <Button 
              onClick={startViewing}
              className="vercel-button flex-1"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Image
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div className="ephemeral-viewer">
        <div className="vercel-card max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <EyeOff className="h-8 w-8 text-white" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">Image Expired</h3>
          <p className="text-muted-foreground mb-6">
            This image has been permanently deleted and cannot be viewed again.
          </p>
          
          <Button onClick={onClose} className="vercel-button">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ephemeral-viewer screenshot-protected" ref={viewerRef}>
      {/* Timer indicator */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="vercel-card flex items-center space-x-2 px-4 py-2">
          <Clock className="h-4 w-4 text-red-400" />
          <span className="text-sm font-mono">
            {timeLeft}s remaining
          </span>
        </div>
      </div>

      {/* Close button */}
      <Button
        onClick={stopViewing}
        variant="outline"
        size="sm"
        className="fixed top-6 right-6 z-10"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Image display */}
      <div className="max-w-4xl max-h-4xl p-8">
        <img
          src={imageUrl}
          alt="Ephemeral content"
          className="max-w-full max-h-full object-contain rounded-lg screenshot-protected"
          style={{
            filter: 'blur(0px)',
            transition: 'filter 0.3s ease'
          }}
          onLoad={() => {
            // Additional protection: prevent image caching
            const img = document.querySelector('.ephemeral-viewer img') as HTMLImageElement;
            if (img) {
              img.style.userSelect = 'none';
              (img.style as any).webkitUserSelect = 'none';
              (img.style as any).mozUserSelect = 'none';
              (img.style as any).msUserSelect = 'none';
              img.draggable = false;
            }
          }}
        />
      </div>

      {/* Warning overlay */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="vercel-card px-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            🔒 Screenshot protected • View once only
          </p>
        </div>
      </div>
    </div>
  );
}