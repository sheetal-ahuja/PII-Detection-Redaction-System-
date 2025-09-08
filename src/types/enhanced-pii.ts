// Enhanced PII types for production-grade system

export interface EnhancedPIIEntity extends PIIEntity {
  context?: string;
  suggestedRedaction?: string;
  relatedEntities?: string[];
  locationInDocument?: {
    page?: number;
    section?: string;
    paragraph?: number;
  };
  metadata?: {
    source?: string;
    extractionMethod?: 'pattern' | 'ml' | 'manual';
    validationStatus?: 'pending' | 'confirmed' | 'rejected';
    lastModified?: string;
  };
}

export interface PIIEntity {
  id: string;
  type: PIIEntityType;
  text: string;
  start: number;
  end: number;
  confidence: number;
  category: 'high' | 'medium' | 'low';
}

export type PIIEntityType = 
  | 'PERSON'
  | 'FULL_NAME'
  | 'FIRST_NAME'
  | 'MAIDEN_NAME'
  | 'EMAIL_ADDRESS'
  | 'PHONE_NUMBER'
  | 'INTERNATIONAL_PHONE'
  | 'FAX_NUMBER'
  | 'LOCATION'
  | 'ADDRESS'
  | 'POSTAL_CODE'
  | 'ZIP_CODE_PLUS_4'
  | 'COORDINATES'
  | 'SSN'
  | 'SSN_ALTERNATIVE'
  | 'PASSPORT_NUMBER'
  | 'DRIVERS_LICENSE'
  | 'TAX_ID'
  | 'CREDIT_CARD'
  | 'BANK_ACCOUNT'
  | 'ROUTING_NUMBER'
  | 'IBAN'
  | 'MEDICAL_RECORD'
  | 'INSURANCE_POLICY'
  | 'PRESCRIPTION_NUMBER'
  | 'LIBRARY_CARD_ID'
  | 'STUDENT_ID'
  | 'EMPLOYEE_ID'
  | 'BADGE_NUMBER'
  | 'DEPARTMENT_CODE'
  | 'USERNAME'
  | 'IP_ADDRESS'
  | 'IPV6_ADDRESS'
  | 'MAC_ADDRESS'
  | 'ACCOUNT_NUMBER'
  | 'MEMBERSHIP_NUMBER'
  | 'CASE_NUMBER'
  | 'EMAIL_SIGNATURE';

export interface EnhancedRedactionMethod extends RedactionMethod {
  preserveFormat?: boolean;
  customPattern?: string;
  replacementStrategy?: 'static' | 'dynamic' | 'contextual';
  securityLevel?: 'low' | 'medium' | 'high' | 'maximum';
  reversible?: boolean;
  configuration?: {
    [key: string]: any;
  };
}

export interface RedactionMethod {
  id: string;
  name: string;
  description: string;
  example: string;
}

export interface EnhancedProcessingResult extends ProcessingResult {
  documentMetadata?: {
    filename?: string;
    fileType?: string;
    fileSize?: number;
    pageCount?: number;
    createdAt?: string;
    modifiedAt?: string;
  };
  processingMetadata?: {
    version?: string;
    algorithm?: string;
    modelVersion?: string;
    processingNode?: string;
    batchId?: string;
  };
  qualityMetrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
  };
  complianceInfo?: {
    standards?: string[];
    certifications?: string[];
    auditTrail?: AuditEntry[];
  };
}

export interface ProcessingResult {
  originalText: string;
  entities: PIIEntity[];
  redactedText: string;
  processingTime: number;
  confidence: number;
}

export interface AuditEntry {
  timestamp: string;
  action: 'created' | 'modified' | 'exported' | 'deleted' | 'accessed';
  userId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EnhancedUploadedFile extends UploadedFile {
  processingStage?: 'upload' | 'text_extraction' | 'pii_detection' | 'completed' | 'failed';
  extractedTextPreview?: string;
  detectedLanguage?: string;
  securityLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPolicy?: {
    expiresAt?: string;
    autoDelete?: boolean;
    archiveAfter?: string;
  };
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  entityTypes: PIIEntityType[];
  redactionMethod: string;
  preserveFormatting: boolean;
  customRules?: {
    entityType: PIIEntityType;
    action: 'redact' | 'mask' | 'ignore' | 'flag';
    customReplacement?: string;
  }[];
}

export interface ProcessingStatistics {
  totalProcessed: number;
  entitiesByType: Record<PIIEntityType, number>;
  entitiesByCategory: Record<'high' | 'medium' | 'low', number>;
  averageProcessingTime: number;
  accuracyMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
  };
  monthlyTrends: {
    month: string;
    processed: number;
    entitiesFound: number;
  }[];
}

export interface ComplianceReport {
  id: string;
  generatedAt: string;
  userId: string;
  documentCount: number;
  totalEntities: number;
  riskAssessment: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    overallScore: number;
  };
  recommendations: string[];
  complianceStatus: 'compliant' | 'partial' | 'non-compliant';
  standards: {
    gdpr: boolean;
    hipaa: boolean;
    ccpa: boolean;
    sox: boolean;
    pci: boolean;
  };
}