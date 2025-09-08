import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
// Set up PDF.js worker with fallback
// Configure PDF.js worker from local URL to avoid CORS/version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface OCRResult {
  text: string;
  confidence: number;
  method: 'ocr' | 'text-extraction' | 'direct';
}

// Enhanced PII patterns with higher accuracy and proper NER-style detection
export const enhancedPIIPatterns = {
  email: {
    pattern: /\b[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\b/g,
    confidence: 0.98
  },
  phone: {
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.95
  },
  ssn: {
    pattern: /\b(?!000|666|9\d\d)\d{3}[-.\s]?(?!00)\d{2}[-.\s]?(?!0000)\d{4}\b/g,
    confidence: 0.99
  },
  creditCard: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9]{2})[0-9]{12}|3[47][0-9]{13}|3[0-9]{13}|2[0-9]{15})\b/g,
    confidence: 0.97
  },
  passport: {
    pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
    confidence: 0.85
  },
  driversLicense: {
    pattern: /\b[A-Z]{1,2}[0-9]{6,8}\b|\b[0-9]{8,10}\b/g,
    confidence: 0.80
  },
  bankAccount: {
    pattern: /\b[0-9]{8,17}\b/g,
    confidence: 0.75
  },
  // Precise PERSON name detection with NER-style validation
  name: {
    pattern: /\b(?:Dr\.?\s+|Mr\.?\s+|Mrs\.?\s+|Ms\.?\s+|Miss\s+|Prof\.?\s+)?[A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?\b/g,
    confidence: 0.95
  },
  // Library Card IDs
  libraryCardId: {
    pattern: /\bLC-\d{6}\b/g,
    confidence: 0.95
  },
  // Employee IDs
  employeeId: {
    pattern: /\bEMP-\d{4,6}\b/g,
    confidence: 0.95
  },
  // Usernames (alphanumeric with possible underscores/numbers)
  username: {
    pattern: /\b[a-zA-Z][a-zA-Z0-9_]*\d+[a-zA-Z0-9_]*\b/g,
    confidence: 0.88
  },
  // Enhanced address detection
  address: {
    pattern: /\b\d+(?:st|nd|rd|th)?\s+(?:Floor|Fl|Level),?\s*[A-Za-z0-9\s]+(?:Tower|Building|Bldg)[A-Za-z0-9\s]*\b|\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
    confidence: 0.85
  },
  // City and state detection
  location: {
    pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b|\b(?:Springfield|San Diego|Los Angeles|New York|Chicago|Houston|Phoenix|Philadelphia|San Antonio|Dallas|Detroit|Jacksonville|Memphis|Nashville|Portland|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Mesa|Virginia Beach|Atlanta|Colorado Springs|Omaha|Raleigh|Miami|Long Beach|Minneapolis|Tulsa|Cleveland|Wichita|Arlington|Tampa|New Orleans|Honolulu|Anaheim|Aurora|Santa Ana|St. Louis|Riverside|Corpus Christi|Lexington|Pittsburgh|Anchorage|Stockton|Cincinnati|St. Paul|Toledo|Greensboro|Newark|Plano|Henderson|Lincoln|Buffalo|Jersey City|Chula Vista|Fort Wayne|Orlando|St. Petersburg|Chandler|Laredo|Norfolk|Durham|Madison|Lubbock|Irvine|Winston-Salem|Glendale|Garland|Hialeah|Reno|Chesapeake|Gilbert|Baton Rouge|Irving|Scottsdale|North Las Vegas|Fremont|Boise|Richmond|San Bernardino|Birmingham|Spokane|Rochester|Des Moines|Modesto|Fayetteville|Tacoma|Oxnard|Fontana|Columbus|Montgomery|Moreno Valley|Shreveport|Aurora|Yonkers|Akron|Huntington Beach|Little Rock|Augusta|Amarillo|Glendale|Mobile|Grand Rapids|Salt Lake City|Tallahassee|Huntsville|Grand Prairie|Knoxville|Worcester|Newport News|Brownsville|Overland Park|Santa Clarita|Providence|Garden Grove|Chattanooga|Oceanside|Jackson|Fort Lauderdale|Santa Rosa|Rancho Cucamonga|Port St. Lucie|Tempe|Ontario|Vancouver|Cape Coral|Sioux Falls|Springfield|Peoria|Pembroke Pines|Elk Grove|Salem|Lancaster|Corona|Eugene|Palmdale|Salinas|Springfield|Pasadena|Fort Collins|Hayward|Pomona|Cary|Rockford|Alexandria|Escondido|McKinney|Kansas City|Joliet|Sunnyvale|Torrance|Bridgeport|Lakewood|Hollywood|Paterson|Naperville|Syracuse|Mesquite|Dayton|Savannah|Clarksville|Orange|Pasadena|Fullerton|Killeen|Frisco|Hampton|McAllen|Warren|Bellevue|West Valley City|Columbia|Olathe|Sterling Heights|New Haven|Miramar|Waco|Thousand Oaks|Cedar Rapids|Charleston|Sioux City|Round Rock|Abilene|Norman|Columbia|Fargo|Wilmington|Evansville|Hartford|Stamford|Concord|Rochester|Birmingham|Billings|Lowell|Camden|Vallejo|Federal Way|Coral Springs|Clearwater|Miami Gardens|Westminster|Murfreesboro|Omaha|Allentown|Davenport|South Bend|Vista|Carrollton|Provo)\b/g,
    confidence: 0.90
  },
  dateOfBirth: {
    pattern: /\b(?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01])[-/.]\d{4}\b|\b(?:0[1-9]|[12]\d|3[01])[-/.](?:0[1-9]|1[0-2])[-/.]\d{4}\b/g,
    confidence: 0.90
  }
};

export async function extractTextWithOCR(file: File): Promise<OCRResult> {
  const fileType = file.type;
  
  try {
    // Handle different file types
    if (fileType === 'application/pdf') {
      return await extractFromPDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractFromDocx(file);
    } else if (fileType === 'text/plain') {
      return await extractFromText(file);
    } else if (fileType.startsWith('image/')) {
      return await extractFromImage(file);
    } else {
      // Fallback to OCR for unknown types
      return await extractFromImage(file);
    }
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error('Failed to extract text from document');
  }
}

async function extractFromPDF(file: File): Promise<OCRResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    if (fullText.trim().length > 0) {
      return {
        text: fullText.trim(),
        confidence: 0.95,
        method: 'text-extraction'
      };
    } else {
      // Fallback to OCR if no text extracted - convert PDF pages to images
      return await extractFromPDFWithOCR(file);
    }
  } catch (error) {
    console.error('PDF extraction failed, falling back to OCR:', error);
    return await extractFromPDFWithOCR(file);
  }
}

async function extractFromPDFWithOCR(file: File): Promise<OCRResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const worker = await createWorker('eng');
    let fullText = '';
    let totalConfidence = 0;
    
    try {
      // Process first page only for performance (can be extended if needed)
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas to render PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
      
      // Convert canvas to blob for OCR
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      // Run OCR on the image
      const { data } = await worker.recognize(blob);
      fullText = data.text;
      totalConfidence = data.confidence / 100;
      
    } finally {
      await worker.terminate();
    }
    
    return {
      text: fullText,
      confidence: totalConfidence,
      method: 'ocr'
    };
  } catch (error) {
    console.error('PDF OCR extraction failed:', error);
    throw new Error('Failed to extract text from PDF using OCR');
  }
}

async function extractFromDocx(file: File): Promise<OCRResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      text: result.value,
      confidence: 0.98,
      method: 'text-extraction'
    };
  } catch (error) {
    console.error('DOCX extraction failed:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

async function extractFromText(file: File): Promise<OCRResult> {
  const text = await file.text();
  return {
    text,
    confidence: 1.0,
    method: 'direct'
  };
}

async function extractFromImage(file: File): Promise<OCRResult> {
  const worker = await createWorker('eng');
  
  try {
    const { data } = await worker.recognize(file);
    
    return {
      text: data.text,
      confidence: data.confidence / 100, // Convert to 0-1 scale
      method: 'ocr'
    };
  } finally {
    await worker.terminate();
  }
}

export function detectEnhancedPII(text: string) {
  const entities: any[] = [];
  let entityId = 1;

  Object.entries(enhancedPIIPatterns).forEach(([type, { pattern, confidence }]) => {
    let match;
    const regex = new RegExp(pattern);
    
    while ((match = regex.exec(text)) !== null) {
      // Additional validation for specific types
      if (type === 'creditCard' && !isValidCreditCard(match[0])) {
        continue;
      }
      
      if (type === 'ssn' && !isValidSSN(match[0])) {
        continue;
      }

      // Enhanced name validation to reduce false positives
      if (type === 'name' && !isValidPersonName(match[0], text, match.index)) {
        continue;
      }

      const category = confidence >= 0.9 ? 'high' : confidence >= 0.8 ? 'medium' : 'low';
      
      entities.push({
        id: `${type}_${entityId++}`,
        type: type.toUpperCase(),
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence,
        category
      });
    }
  });

  return entities;
}

// Credit card validation using Luhn algorithm
function isValidCreditCard(number: string): boolean {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// SSN validation
function isValidSSN(ssn: string): boolean {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;
  
  const area = cleaned.substring(0, 3);
  const group = cleaned.substring(3, 5);
  const serial = cleaned.substring(5, 9);
  
  // Check for invalid areas
  if (area === '000' || area === '666' || area.startsWith('9')) return false;
  if (group === '00' || serial === '0000') return false;
  
  return true;
}

// NER-style person name validation to distinguish real people from document metadata
function isValidPersonName(name: string, fullText: string, position: number): boolean {
  // Get extended context for better analysis
  const contextStart = Math.max(0, position - 150);
  const contextEnd = Math.min(fullText.length, position + name.length + 150);
  const context = fullText.substring(contextStart, contextEnd);
  const beforeText = fullText.substring(contextStart, position);
  const afterText = fullText.substring(position + name.length, contextEnd);
  
  // IMMEDIATE REJECTION: Document structure patterns
  const documentRejectionPatterns = [
    /\b(document|record|notes?|form|report|file|header|title|section|chapter|policy|manual|guide|instruction)\b/i,
    /\b(library\s+card|book\s+title|return\s+date|due\s+date|document\s+type|form\s+name)\b/i,
    /:$/, // Ends with colon (header pattern)
    /^\s*-\s*/, // Starts with dash (list item)
    /\b(type|category|classification|status|level|grade|rank|position)\s*:\s*$/i
  ];
  
  // Check if name appears with document structure indicators
  for (const pattern of documentRejectionPatterns) {
    if (pattern.test(beforeText) || pattern.test(afterText)) {
      return false;
    }
  }
  
  // IMMEDIATE REJECTION: Name followed by job titles/roles that indicate it's metadata
  const roleRejectionPatterns = [
    /\b(employee|staff|worker|manager|director|supervisor|coordinator|administrator|assistant|specialist|analyst|engineer|developer|designer|consultant|advisor|representative|associate|intern|volunteer|participant|applicant|candidate|recipient|beneficiary)\b/i,
    /\b(id|number|code|ref|reference)\b/i
  ];
  
  for (const pattern of roleRejectionPatterns) {
    if (pattern.test(afterText.substring(0, 50))) {
      return false;
    }
  }
  
  // IMMEDIATE ACCEPTANCE: Strong person indicators
  const strongAcceptancePatterns = [
    /\b(?:dr\.?|mr\.?|mrs\.?|ms\.?|miss|prof\.?|doctor)\s*$/i, // Title before name
    /\b(patient|client|customer|visitor|guest|resident|student|member)\s+(?:name\s*[:.]?\s*)?$/i,
    /\b(signed\s+by|written\s+by|created\s+by|prepared\s+by|reviewed\s+by|approved\s+by)\s*$/i,
    /\b(dear|hello|hi|sincerely|regards|from|to|cc|bcc)\s*$/i,
    /\b(contact|author|creator|owner|holder)\s*[:.]?\s*$/i
  ];
  
  for (const pattern of strongAcceptancePatterns) {
    if (pattern.test(beforeText)) {
      return true;
    }
  }
  
  // Check for title prefix in the name itself
  if (/^(?:Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Miss|Prof\.?)\s+/i.test(name)) {
    return true;
  }
  
  // Validate proper name structure
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length < 2 || nameParts.length > 3) {
    return false;
  }
  
  // Each part must be properly capitalized (Title Case)
  const isValidNameStructure = nameParts.every(part => {
    return part.length >= 2 && 
           /^[A-Z][a-z]+$/.test(part) && 
           part.length <= 15;
  });
  
  if (!isValidNameStructure) {
    return false;
  }
  
  // Common first names (basic validation)
  const commonFirstNames = [
    'emily', 'sarah', 'michael', 'john', 'jane', 'david', 'lisa', 'robert', 'mary', 'james',
    'rajesh', 'priya', 'kumar', 'chen', 'wang', 'singh', 'patel', 'johnson', 'smith', 'brown',
    'garcia', 'miller', 'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez',
    'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez',
    'thompson', 'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker',
    'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores', 'green'
  ];
  
  const firstName = nameParts[0].toLowerCase();
  if (commonFirstNames.includes(firstName)) {
    return true;
  }
  
  // If it passed all structural checks and doesn't match rejection patterns, accept it
  return true;
}