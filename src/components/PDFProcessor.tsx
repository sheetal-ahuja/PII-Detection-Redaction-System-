import React, { useState, useCallback } from 'react';
import { FileText, AlertCircle, CheckCircle, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface PDFProcessorProps {
  file: File;
  onTextExtracted: (text: string, metadata: PDFMetadata) => void;
  onError: (error: string) => void;
}

interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  isEncrypted: boolean;
  hasPassword: boolean;
  fileSize: number;
  version?: string;
}

interface ProcessingStatus {
  stage: 'loading' | 'extracting' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export const PDFProcessor: React.FC<PDFProcessorProps> = ({
  file,
  onTextExtracted,
  onError
}) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'loading',
    progress: 0,
    message: 'Initializing PDF processor...'
  });
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [extractedText, setExtractedText] = useState('');

  // Simulate PDF processing (in production, use actual PDF.js or similar)
  const processPDF = useCallback(async (file: File, password?: string) => {
    try {
      setStatus({
        stage: 'loading',
        progress: 10,
        message: 'Loading PDF document...'
      });

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if file is actually a PDF
      if (file.type !== 'application/pdf') {
        throw new Error('Invalid file type. Please upload a PDF document.');
      }

      setStatus({
        stage: 'extracting',
        progress: 30,
        message: 'Analyzing document structure...'
      });

      // Simulate metadata extraction
      const mockMetadata: PDFMetadata = {
        title: file.name.replace('.pdf', ''),
        pageCount: Math.floor(Math.random() * 20) + 1,
        isEncrypted: Math.random() > 0.8, // 20% chance encrypted
        hasPassword: false,
        fileSize: file.size,
        creationDate: new Date().toISOString(),
        version: '1.4'
      };

      setMetadata(mockMetadata);

      // Check for password protection
      if (mockMetadata.isEncrypted && !password) {
        setNeedsPassword(true);
        setStatus({
          stage: 'error',
          progress: 30,
          message: 'Document is password protected'
        });
        return;
      }

      setStatus({
        stage: 'extracting',
        progress: 50,
        message: 'Extracting text content...'
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo purposes, generate sample text with PII
      const sampleTexts = [
        `CONFIDENTIAL EMPLOYEE RECORD

Employee Information:
Name: John Michael Smith
Employee ID: EMP12345
Social Security Number: 123-45-6789
Date of Birth: January 15, 1985
Address: 1234 Main Street, Anytown, CA 90210
Phone: (555) 123-4567
Email: john.smith@company.com

Emergency Contact:
Name: Jane Smith
Relationship: Spouse
Phone: (555) 987-6543

Salary Information:
Annual Salary: $75,000
Bank Account: 123456789 (Routing: 987654321)
Direct Deposit: Wells Fargo

Medical Information:
Insurance Policy: POL987654321
Medical Record Number: MRN123456789
Primary Physician: Dr. Robert Johnson

This document contains sensitive personal information and should be handled according to company privacy policies.`,

        `CUSTOMER SERVICE TRANSCRIPT

Date: March 15, 2024
Agent: Sarah Wilson (ID: EMP98765)
Customer: Michael Davis

Customer Information:
Phone: (555) 456-7890
Email: michael.davis@email.com
Address: 5678 Oak Avenue, Springfield, IL 62701
Account Number: ACCT789012345

Issue: Password reset request for online banking
Security Questions Verified:
- Mother's maiden name: Johnson
- First pet's name: Buddy

Credit Card on File: 4532-1234-5678-9012
Expiration: 12/25
CVV verified successfully

Resolution: Password reset email sent to michael.davis@email.com
Case Number: CASE2024031501

Agent Notes: Customer was polite and cooperative. All security protocols followed.`,

        `MEDICAL PATIENT RECORD

Patient: Emily Rodriguez
Date of Birth: 08/22/1990
Social Security: 987-65-4321
Address: 9876 Pine Street, Los Angeles, CA 90015
Phone: (555) 789-0123
Email: emily.rodriguez@email.com

Insurance Information:
Provider: Blue Cross Blue Shield
Policy Number: BCBS987654321
Group Number: GRP123456

Medical Record Number: MRN987654321
Primary Care Physician: Dr. Lisa Chen
Phone: (555) 234-5678

Prescription History:
- Lisinopril 10mg - Rx#: RX789012345
- Metformin 500mg - Rx#: RX456789012

Emergency Contact:
Maria Rodriguez (Mother)
Phone: (555) 345-6789

This information is protected under HIPAA regulations.`
      ];

      const selectedText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
      setExtractedText(selectedText);

      setStatus({
        stage: 'processing',
        progress: 80,
        message: 'Processing extracted text...'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus({
        stage: 'completed',
        progress: 100,
        message: 'PDF processing completed successfully'
      });

      // Call the callback with extracted text and metadata
      onTextExtracted(selectedText, mockMetadata);

      toast({
        title: 'PDF Processed Successfully',
        description: `Extracted ${selectedText.length} characters from ${mockMetadata.pageCount} pages.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus({
        stage: 'error',
        progress: 0,
        message: errorMessage
      });
      onError(errorMessage);
      toast({
        title: 'PDF Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [onTextExtracted, onError, toast]);

  const handlePasswordSubmit = () => {
    if (password.trim()) {
      setNeedsPassword(false);
      processPDF(file, password);
    }
  };

  // Auto-start processing when component mounts
  React.useEffect(() => {
    processPDF(file);
  }, [file, processPDF]);

  const getStatusColor = () => {
    switch (status.stage) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'loading':
      case 'extracting':
      case 'processing': return 'text-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (status.stage) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            PDF Document Processing
          </CardTitle>
          <CardDescription>
            Extracting and analyzing content from {file.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {status.message}
              </span>
              <span className="text-sm text-muted-foreground">
                {status.progress}%
              </span>
            </div>
            <Progress value={status.progress} className="w-full" />
          </div>

          {/* Password Input for Encrypted PDFs */}
          {needsPassword && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This PDF is password protected. Please enter the password to continue.
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Input
                  type="password"
                  placeholder="Enter PDF password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
                <Button onClick={handlePasswordSubmit} disabled={!password.trim()}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock
                </Button>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Document Metadata */}
      {metadata && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Title:</span>
                  <p className="text-sm text-muted-foreground">{metadata.title || 'Untitled'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Pages:</span>
                  <p className="text-sm text-muted-foreground">{metadata.pageCount}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">File Size:</span>
                  <p className="text-sm text-muted-foreground">
                    {(metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">PDF Version:</span>
                  <p className="text-sm text-muted-foreground">{metadata.version || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Security:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {metadata.isEncrypted ? (
                      <Badge variant="destructive" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Encrypted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Unlock className="h-3 w-3" />
                        Not Encrypted
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Creation Date:</span>
                  <p className="text-sm text-muted-foreground">
                    {metadata.creationDate ? new Date(metadata.creationDate).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Text Preview */}
      {extractedText && status.stage === 'completed' && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle>Extracted Text Preview</CardTitle>
            <CardDescription>
              {extractedText.length.toLocaleString()} characters extracted • Ready for PII analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto p-4 bg-muted/20 rounded-lg">
              <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {extractedText.length > 1000 
                  ? extractedText.substring(0, 1000) + '...\n\n[Text truncated for preview]'
                  : extractedText
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};