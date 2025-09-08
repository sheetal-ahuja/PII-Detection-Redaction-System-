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
  | 'NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'SSN'
  | 'CREDITCARD'
  | 'PASSPORT'
  | 'DRIVERSLICENSE'
  | 'BANKACCOUNT'
  | 'LIBRARYCARDID'
  | 'EMPLOYEEID'
  | 'USERNAME'
  | 'ADDRESS'
  | 'LOCATION'
  | 'DATEOFBIRTH';

export interface RedactionMethod {
  id: string;
  name: string;
  description: string;
  example?: string;
  enabled: boolean;
  icon: any;
}

export interface ProcessingResult {
  originalText: string;
  entities: PIIEntity[];
  redactedText: string;
  processingTime?: number;
  confidence: number;
  method: string;
  timestamp: string;
  stats: {
    totalEntities: number;
    highRiskEntities: number;
    mediumRiskEntities: number;
    lowRiskEntities: number;
    averageConfidence: number;
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