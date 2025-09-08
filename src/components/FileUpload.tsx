import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { UploadedFile } from '@/types/pii';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onTextInput: (text: string) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  isProcessing?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onTextInput,
  uploadedFiles,
  onRemoveFile
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextInput(textInput);
      setTextInput('');
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Zone */}
      <Card className="card-gradient">
        <div className="p-6">
          <div
            className={cn(
              "upload-zone relative overflow-hidden p-8 text-center transition-all duration-200",
              isDragging && "drag-over"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className={cn(
                  "upload-icon h-8 w-8 text-primary transition-all duration-200",
                  isDragging && "scale-110"
                )} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Upload Document
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Drop your PDF or text file here, or click to browse
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Supports PDF and TXT files</span>
                <span>•</span>
                <span>Max 10MB</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Text Input Alternative */}
      <Card className="card-gradient">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Or Enter Text Directly
              </h3>
              <p className="text-sm text-muted-foreground">
                Paste or type text that may contain PII for analysis
              </p>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text containing potential PII (names, emails, phone numbers, etc.)..."
                className="min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {textInput.length} characters
                </span>
                <Button 
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  Analyze Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card className="card-gradient">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Uploaded Files
            </h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.status === 'processing' && (
                      <Progress value={65} className="w-20 h-2" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(file.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};