import { useState, useRef, useCallback } from "react";
import { Upload, Image, X, FileIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File, isEphemeral: boolean) => void;
  onClose: () => void;
}

export function FileUpload({ onFileSelect, onClose }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isEphemeral, setIsEphemeral] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const validateFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Only images (JPEG, PNG, GIF, WebP) are supported.",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSend = () => {
    if (selectedFile) {
      onFileSelect(selectedFile, isEphemeral);
      
      // Cleanup preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="vercel-card max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Share File</h3>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!selectedFile ? (
          <>
            <div
              className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop files here</p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Images only • Max 10MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="file-preview object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              
              <Button onClick={clearSelection} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Ephemeral option */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Sharing Mode:</label>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={isEphemeral}
                    onChange={() => setIsEphemeral(true)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium">🔥 Ephemeral (Recommended)</div>
                    <div className="text-xs text-muted-foreground">
                      View once • 20 seconds • Screenshot protected
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isEphemeral}
                    onChange={() => setIsEphemeral(false)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium">📁 Standard</div>
                    <div className="text-xs text-muted-foreground">
                      Downloadable • Persistent until chat ends
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleSend} className="vercel-button flex-1">
                <Send className="mr-2 h-4 w-4" />
                Send {isEphemeral ? 'Ephemeral' : 'File'}
              </Button>
              <Button onClick={clearSelection} variant="outline">
                Change
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}