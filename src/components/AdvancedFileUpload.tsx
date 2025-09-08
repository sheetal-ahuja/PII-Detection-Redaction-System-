import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, FileText, FileImage, FileArchive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { UploadedFile } from '@/types/pii';

interface AdvancedFileUploadProps {
  onFileUpload: (files: File[]) => void;
  onTextInput?: (text: string) => void;
  onTextSubmit?: (text: string) => void;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
  isProcessing?: boolean;
  maxFileSize?: number;
  maxFiles?: number;
  selectedMethod?: string;
  onMethodChange?: (method: string) => void;
  redactionMethods?: any[];
}

const SUPPORTED_FORMATS = {
  'application/pdf': { icon: FileText, label: 'PDF', color: 'text-red-500' },
  'text/plain': { icon: FileText, label: 'TXT', color: 'text-blue-500' },
  'application/msword': { icon: FileText, label: 'DOC', color: 'text-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    icon: FileText, label: 'DOCX', color: 'text-blue-600' 
  },
  'text/csv': { icon: FileText, label: 'CSV', color: 'text-green-500' },
  'application/json': { icon: FileText, label: 'JSON', color: 'text-yellow-500' }
};

export const AdvancedFileUpload: React.FC<AdvancedFileUploadProps> = ({
  onFileUpload,
  onTextInput,
  onTextSubmit,
  uploadedFiles = [],
  onRemoveFile,
  isProcessing = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  selectedMethod,
  onMethodChange,
  redactionMethods = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = Object.keys(SUPPORTED_FORMATS).includes(file.type);
      const isValidSize = file.size <= maxFileSize;
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      console.warn('Some files were rejected due to invalid type or size');
    }

    const remainingSlots = maxFiles - uploadedFiles.length;
    const filesToUpload = validFiles.slice(0, remainingSlots);

    if (filesToUpload.length > 0) {
      onFileUpload(filesToUpload);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      if (onTextSubmit) {
        onTextSubmit(textInput);
      } else if (onTextInput) {
        onTextInput(textInput);
      }
      setTextInput('');
    }
  };

  const getFileIcon = (type: string) => {
    const format = SUPPORTED_FORMATS[type as keyof typeof SUPPORTED_FORMATS];
    if (format) {
      const IconComponent = format.icon;
      return <IconComponent className={`h-5 w-5 ${format.color}`} />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadProgress = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading': return 45;
      case 'processing': return 75;
      case 'completed': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="text">Text Input</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {/* File Upload Zone */}
          <Card className="card-gradient card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Upload documents for PII detection and redaction. Supports batch processing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "upload-zone relative overflow-hidden p-8 text-center transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center",
                  isDragging && "drag-over",
                  isProcessing && "opacity-50 pointer-events-none"
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={Object.keys(SUPPORTED_FORMATS).join(',')}
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
                
                <div className="space-y-4">
                  <div className={cn(
                    "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-all duration-300",
                    isDragging && "bg-primary/20 scale-110"
                  )}>
                    <Upload className={cn(
                      "h-8 w-8 text-primary transition-all duration-300",
                      isDragging && "scale-110 text-primary",
                      isProcessing && "animate-pulse"
                    )} />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {isDragging ? 'Drop files here' : 'Upload Documents'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Drop files here or click to browse
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                    {Object.entries(SUPPORTED_FORMATS).map(([type, format]) => (
                      <div key={type} className="flex items-center gap-1">
                        <format.icon className={`h-3 w-3 ${format.color}`} />
                        <span>{format.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <Badge variant="outline">Max {formatFileSize(maxFileSize)}</Badge>
                    <Badge variant="outline">Up to {maxFiles} files</Badge>
                    <Badge variant="outline">Batch processing</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Statistics */}
          {uploadedFiles.length > 0 && (
            <Card className="card-gradient">
              <CardHeader>
                <CardTitle className="text-lg">Processing Queue</CardTitle>
                <CardDescription>
                  {uploadedFiles.length} files • {uploadedFiles.filter(f => f.status === 'completed').length} completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(file.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {file.name}
                          </p>
                          <Badge 
                            variant={file.status === 'completed' ? 'default' : 'secondary'}
                            className="ml-2 flex-shrink-0"
                          >
                            {file.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          {file.status !== 'completed' && file.status !== 'error' && (
                            <Progress 
                              value={getUploadProgress(file)} 
                              className="w-24 h-2"
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusIcon(file.status)}
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          {/* Text Input */}
          <Card className="card-gradient card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Direct Text Input
              </CardTitle>
              <CardDescription>
                Paste or type text containing potential PII for immediate analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter or paste text containing potential PII (names, emails, phone numbers, addresses, etc.)..."
                  className="min-h-[200px] resize-none font-mono text-sm"
                  maxLength={50000}
                />
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{textInput.length.toLocaleString()} / 50,000 characters</span>
                    <span>•</span>
                    <span>{textInput.split(/\s+/).filter(word => word.length > 0).length} words</span>
                    <span>•</span>
                    <span>{textInput.split('\n').length} lines</span>
                  </div>
                  
                  <Button 
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || isProcessing}
                    className="bg-gradient-primary hover:opacity-90 transition-opacity"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Analyze Text'
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Text Analysis Preview */}
              {textInput.length > 100 && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-medium text-card-foreground mb-2">Quick Preview</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Estimated processing time: ~{Math.ceil(textInput.length / 10000)}s</p>
                    <p>Potential patterns: Email addresses, phone numbers, names, addresses</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};