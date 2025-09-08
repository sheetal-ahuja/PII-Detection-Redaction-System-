import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface PIIEntity {
  type: string
  text: string
  start: number
  end: number
  confidence: number
  category: 'high' | 'medium' | 'low'
  context?: string
}

// Comprehensive PII detection patterns - Enterprise Grade
const PII_PATTERNS = {
  // Personal identifiers - Enhanced name detection
  PERSON: {
    pattern: /\b([A-Z][a-z]{2,20}(?:\s+[A-Z][a-z]{2,20}){1,2})\b/g,
    confidence: 0.85,
    category: 'high' as const
  },
  FULL_NAME: {
    pattern: /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,2})\b/g,
    confidence: 0.88,
    category: 'high' as const
  },
  TITLE_NAME: {
    pattern: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Professor)\s+([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})*)\b/g,
    confidence: 0.95,
    category: 'high' as const
  },
  MAIDEN_NAME: {
    pattern: /\b(?:maiden|birth|née)\s+name[:\s]+([A-Z][a-z]+)\b/gi,
    confidence: 0.90,
    category: 'high' as const
  },
  
  // Contact Information
  EMAIL_ADDRESS: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    confidence: 0.96,
    category: 'high' as const
  },
  PHONE_NUMBER: {
    pattern: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    confidence: 0.92,
    category: 'high' as const
  },
  INTERNATIONAL_PHONE: {
    pattern: /\+(?:[0-9] ?){6,14}[0-9]/g,
    confidence: 0.88,
    category: 'high' as const
  },
  FAX_NUMBER: {
    pattern: /\b(?:fax|f):?\s*(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/gi,
    confidence: 0.90,
    category: 'medium' as const
  },

  // Government IDs
  SSN: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.99,
    category: 'high' as const
  },
  SSN_ALTERNATIVE: {
    pattern: /\b\d{3}\s\d{2}\s\d{4}\b/g,
    confidence: 0.95,
    category: 'high' as const
  },
  PASSPORT_NUMBER: {
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    confidence: 0.85,
    category: 'high' as const
  },
  DRIVERS_LICENSE: {
    pattern: /\b(?:DL|D\.L\.|Driver.*License)[:\s]*([A-Z0-9]{8,20})\b/gi,
    confidence: 0.88,
    category: 'high' as const
  },
  TAX_ID: {
    pattern: /\b(?:TIN|EIN|Tax.*ID)[:\s]*(\d{2}-\d{7})\b/gi,
    confidence: 0.92,
    category: 'high' as const
  },

  // Financial Information
  CREDIT_CARD: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    confidence: 0.97,
    category: 'high' as const
  },
  BANK_ACCOUNT: {
    pattern: /\b(?:Account.*Number|Acct.*#)[:\s]*([0-9]{8,17})\b/gi,
    confidence: 0.90,
    category: 'high' as const
  },
  ROUTING_NUMBER: {
    pattern: /\b(?:Routing|ABA)[:\s]*(\d{9})\b/gi,
    confidence: 0.95,
    category: 'high' as const
  },
  IBAN: {
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
    confidence: 0.93,
    category: 'high' as const
  },

  // Location Data
  ADDRESS: {
    pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir)\b/gi,
    confidence: 0.83,
    category: 'medium' as const
  },
  POSTAL_CODE: {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    confidence: 0.75,
    category: 'low' as const
  },
  ZIP_CODE_PLUS_4: {
    pattern: /\b\d{5}-\d{4}\b/g,
    confidence: 0.85,
    category: 'medium' as const
  },
  COORDINATES: {
    pattern: /\b[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)\b/g,
    confidence: 0.88,
    category: 'medium' as const
  },

  // Healthcare Information
  MEDICAL_RECORD: {
    pattern: /\b(?:MRN|Medical.*Record)[:\s]*([A-Z0-9]{6,15})\b/gi,
    confidence: 0.92,
    category: 'high' as const
  },
  INSURANCE_POLICY: {
    pattern: /\b(?:Policy|Member.*ID)[:\s]*([A-Z0-9]{8,20})\b/gi,
    confidence: 0.88,
    category: 'high' as const
  },
  PRESCRIPTION_NUMBER: {
    pattern: /\b(?:Rx|Prescription)[:\s]*(\d{7,12})\b/gi,
    confidence: 0.85,
    category: 'medium' as const
  },

  // Employment Information
  EMPLOYEE_ID: {
    pattern: /\b(?:EMP|Employee.*ID)[:\s]*([A-Z0-9]{4,12})\b/gi,
    confidence: 0.87,
    category: 'medium' as const
  },
  BADGE_NUMBER: {
    pattern: /\b(?:Badge|ID.*Badge)[:\s]*([A-Z0-9]{4,10})\b/gi,
    confidence: 0.80,
    category: 'medium' as const
  },
  DEPARTMENT_CODE: {
    pattern: /\b(?:Dept|Department)[:\s]*([A-Z]{2,6}\d{2,4})\b/gi,
    confidence: 0.75,
    category: 'low' as const
  },

  // Digital Identity
  IP_ADDRESS: {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    confidence: 0.90,
    category: 'medium' as const
  },
  IPV6_ADDRESS: {
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    confidence: 0.95,
    category: 'medium' as const
  },
  MAC_ADDRESS: {
    pattern: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
    confidence: 0.93,
    category: 'medium' as const
  },
  USERNAME: {
    pattern: /@[a-zA-Z0-9_]{3,20}/g,
    confidence: 0.72,
    category: 'low' as const
  },
  ACCOUNT_NUMBER: {
    pattern: /\b(?:Account|Acct)[:\s]*([A-Z0-9]{6,20})\b/gi,
    confidence: 0.80,
    category: 'medium' as const
  },

  // Custom Organization-Specific
  LIBRARY_CARD_ID: {
    pattern: /\b(?:LIB|Library)[:\s]*([A-Z0-9]{6,12})\b/gi,
    confidence: 0.92,
    category: 'medium' as const
  },
  STUDENT_ID: {
    pattern: /\b(?:Student.*ID|SID)[:\s]*([A-Z0-9]{6,12})\b/gi,
    confidence: 0.88,
    category: 'medium' as const
  },
  MEMBERSHIP_NUMBER: {
    pattern: /\b(?:Member|Membership)[:\s]*([A-Z0-9]{6,15})\b/gi,
    confidence: 0.85,
    category: 'low' as const
  },
  CASE_NUMBER: {
    pattern: /\b(?:Case|Ticket)[:\s]*([A-Z0-9]{6,15})\b/gi,
    confidence: 0.87,
    category: 'medium' as const
  },

  // Email Signatures and Corporate
  EMAIL_SIGNATURE: {
    pattern: /\b[A-Za-z\s]+\n[A-Za-z\s&,\.]+\n(?:Phone|Tel|Mobile)[:\s]*[\d\s\-\(\)]+/gm,
    confidence: 0.80,
    category: 'medium' as const
  }
}

function detectPII(text: string): PIIEntity[] {
  const entities: PIIEntity[] = []
  
  // Document structure patterns to reject as names
  const documentRejectPatterns = [
    /\b\w+\s+(Document|Record|Notes|Report|Summary|File|Page|Section|Chapter|Form|Application|Template|Manual|Guide|Policy|Procedure)\b/gi,
    /\b(Document|Record|Notes|Report|Summary|File|Page|Section|Chapter|Form|Application|Template|Manual|Guide|Policy|Procedure)\s+\w+\b/gi,
    /\b\w+\s+(ID|Number|Code|Reference|Ref|#)\b/gi,
    /^(From|To|Subject|Date|Time|Location|Address|Phone|Email|Website|URL):/i,
    /\b(Employee|Staff|Manager|Director|Administrator|Supervisor|Coordinator|Specialist|Assistant|Analyst|Officer|Representative|Agent)\s+(ID|Number|Code|Reference)\b/gi,
    /\b(Customer|Client|Patient|Student|Member|User|Visitor|Guest)\s+(ID|Number|Code|Reference)\b/gi
  ]
  
  // Common names validation list
  const commonNames = new Set([
    'Emily', 'Johnson', 'Jane', 'Goodall', 'Sarah', 'Lee', 'Rajesh', 'Kumar', 
    'Priya', 'Nair', 'Michael', 'Chen', 'David', 'Brown', 'Lisa', 'Garcia',
    'Robert', 'Miller', 'Jessica', 'Moore', 'James', 'Taylor', 'Ashley', 'Thomas',
    'John', 'Smith', 'Mary', 'Williams', 'Patricia', 'Anderson', 'Jennifer', 'Wilson',
    'Elizabeth', 'Martinez', 'Linda', 'Thompson', 'Barbara', 'White', 'Susan', 'Harris'
  ])
  
  for (const [entityType, config] of Object.entries(PII_PATTERNS)) {
    const matches = text.matchAll(config.pattern)
    
    for (const match of matches) {
      if (match.index !== undefined) {
        const matchText = match[0].trim()
        let shouldInclude = true
        let confidence = config.confidence
        
        // Enhanced filtering for person names
        if (entityType === 'PERSON' || entityType === 'FULL_NAME' || entityType === 'TITLE_NAME') {
          // Check against document structure patterns
          for (const rejectPattern of documentRejectPatterns) {
            if (rejectPattern.test(matchText) || rejectPattern.test(text.slice(Math.max(0, match.index - 30), match.index + matchText.length + 30))) {
              shouldInclude = false
              break
            }
          }
          
          if (shouldInclude) {
            // Extract clean name without job titles or extra words
            let cleanName = matchText
            
            // Remove common job title suffixes
            cleanName = cleanName.replace(/\s+(Employee|Staff|Manager|Director|Administrator|Supervisor|Coordinator|Specialist|Assistant|Analyst|Officer|Representative|Agent|Borrower|Author|Sender|Reviewer)$/gi, '')
            
            // Remove parenthetical information
            cleanName = cleanName.replace(/\s*\([^)]+\)$/g, '')
            
            // Validate clean name has at least 2 words and each word is 2+ chars
            const nameParts = cleanName.trim().split(/\s+/)
            if (nameParts.length < 2 || nameParts.some(part => part.length < 2)) {
              shouldInclude = false
            } else {
              // Boost confidence if contains common names
              const hasCommonName = nameParts.some(part => commonNames.has(part))
              if (hasCommonName) {
                confidence = Math.min(0.95, confidence + 0.1)
              }
              
              // Use cleaned name for the entity
              matchText = cleanName.trim()
            }
          }
        }
        
        if (shouldInclude) {
          const context = text.slice(
            Math.max(0, match.index - 20),
            Math.min(text.length, match.index + match[0].length + 20)
          )
          
          entities.push({
            type: entityType,
            text: matchText,
            start: match.index,
            end: match.index + matchText.length,
            confidence: confidence,
            category: config.category,
            context: context.trim()
          })
        }
      }
    }
  }
  
  // Remove duplicates and overlapping entities, keeping highest confidence
  const filteredEntities: PIIEntity[] = []
  const sortedEntities = entities.sort((a, b) => a.start - b.start)
  
  for (const entity of sortedEntities) {
    const hasOverlap = filteredEntities.some(existing => 
      (entity.start >= existing.start && entity.start < existing.end) ||
      (entity.end > existing.start && entity.end <= existing.end) ||
      (entity.start <= existing.start && entity.end >= existing.end)
    )
    
    if (!hasOverlap) {
      filteredEntities.push(entity)
    } else {
      // Replace if higher confidence
      const overlappingIndex = filteredEntities.findIndex(existing => 
        (entity.start >= existing.start && entity.start < existing.end) ||
        (entity.end > existing.start && entity.end <= existing.end) ||
        (entity.start <= existing.start && entity.end >= existing.end)
      )
      
      if (overlappingIndex !== -1 && entity.confidence > filteredEntities[overlappingIndex].confidence) {
        filteredEntities[overlappingIndex] = entity
      }
    }
  }
  
  return filteredEntities.sort((a, b) => a.start - b.start)
}

function applyRedaction(text: string, entities: PIIEntity[], method: string): string {
  let redactedText = text
  const entityCounts: Record<string, number> = {}
  
  // Process entities in reverse order to maintain positions
  const sortedEntities = [...entities].sort((a, b) => b.start - a.start)
  
  for (const entity of sortedEntities) {
    entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1
    const entityNum = entityCounts[entity.type]
    
    let replacement = ''
    
    switch (method) {
      case 'Smart Placeholders':
        replacement = `[${entity.type}_${entityNum.toString().padStart(2, '0')}]`
        break
        
      case 'Contextual Masking':
        replacement = applyContextualMasking(entity)
        break
        
      case 'Synthetic Data':
        replacement = generateSyntheticData(entity.type, entityNum)
        break
        
      case 'Cryptographic Hash':
        replacement = generateCryptographicHash(entity.text, entity.type)
        break
        
      case 'Partial Visibility':
        replacement = applyPartialVisibility(entity)
        break
        
      default:
        replacement = '[REDACTED]'
    }
    
    redactedText = redactedText.slice(0, entity.start) + replacement + redactedText.slice(entity.end)
  }
  
  return redactedText
}

function applyContextualMasking(entity: PIIEntity): string {
  const { type, text } = entity
  
  switch (type) {
    case 'EMAIL_ADDRESS':
      const [user, domain] = text.split('@')
      const maskedUser = user.length > 2 
        ? user[0] + '█'.repeat(user.length - 2) + user[user.length - 1]
        : '█'.repeat(user.length)
      return `${maskedUser}@${domain}`
      
    case 'SSN':
    case 'SSN_ALTERNATIVE':
      if (text.includes('-')) {
        return 'XXX-XX-' + text.slice(-4)
      } else {
        return 'XXX XX ' + text.slice(-4)
      }
      
    case 'PHONE_NUMBER':
    case 'INTERNATIONAL_PHONE':
      if (text.includes('(')) {
        return '(XXX) XXX-' + text.slice(-4)
      } else if (text.includes('+')) {
        return '+XX ' + 'X'.repeat(text.length - 6) + ' ' + text.slice(-4)
      } else {
        return 'XXX-XXX-' + text.slice(-4)
      }
      
    case 'CREDIT_CARD':
      return 'XXXX-XXXX-XXXX-' + text.slice(-4)
      
    case 'ADDRESS':
      const parts = text.split(' ')
      return 'XXX ' + parts.slice(1).join(' ')
      
    case 'PERSON':
    case 'FULL_NAME':
      const names = text.split(' ')
      if (names.length === 2) {
        return names[0][0] + '█'.repeat(names[0].length - 1) + ' ' + 
               names[1][0] + '█'.repeat(names[1].length - 1)
      } else {
        return names.map(name => name[0] + '█'.repeat(name.length - 1)).join(' ')
      }
      
    case 'IP_ADDRESS':
      const ipParts = text.split('.')
      return ipParts.slice(0, 2).join('.') + '.XXX.XXX'
      
    default:
      const length = Math.min(text.length, 12)
      return '█'.repeat(length)
  }
}

function generateSyntheticData(entityType: string, entityNum: number): string {
  const syntheticData: Record<string, string[]> = {
    PERSON: [
      'John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Wilson',
      'David Brown', 'Lisa Garcia', 'Robert Miller', 'Emily Davis',
      'William Anderson', 'Jessica Moore', 'James Taylor', 'Ashley Thomas'
    ],
    FULL_NAME: [
      'John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Wilson'
    ],
    EMAIL_ADDRESS: [
      'user@example.com', 'contact@company.org', 'info@business.net',
      'admin@enterprise.com', 'support@service.co', 'hello@startup.io'
    ],
    PHONE_NUMBER: [
      '(555) 123-4567', '(555) 987-6543', '(555) 456-7890',
      '(555) 321-9876', '(555) 654-3210', '(555) 789-0123'
    ],
    ADDRESS: [
      '123 Main Street', '456 Oak Avenue', '789 Pine Road',
      '321 Elm Drive', '654 Maple Lane', '987 Cedar Court'
    ],
    SSN: [
      '123-45-6789', '987-65-4321', '456-78-9012'
    ],
    CREDIT_CARD: [
      '4111111111111111', '5555555555554444', '378282246310005'
    ],
    IP_ADDRESS: [
      '192.168.1.100', '10.0.0.50', '172.16.0.200'
    ]
  }
  
  const options = syntheticData[entityType] || ['[SYNTHETIC_DATA]']
  return options[entityNum % options.length]
}

function generateCryptographicHash(text: string, entityType: string): string {
  // Simple hash simulation for demo (in production, use proper crypto)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const hashStr = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8).toUpperCase()
  return `[HASH_${entityType}_${hashStr}]`
}

function applyPartialVisibility(entity: PIIEntity): string {
  const { type, text } = entity
  
  switch (type) {
    case 'EMAIL_ADDRESS':
      const [user, domain] = text.split('@')
      return user.slice(0, 2) + '***@' + domain
      
    case 'PHONE_NUMBER':
      return '***-***-' + text.slice(-4)
      
    case 'PERSON':
    case 'FULL_NAME':
      const names = text.split(' ')
      return names[0] + ' ' + names.slice(1).map(n => n[0] + '***').join(' ')
      
    case 'ADDRESS':
      const parts = text.split(' ')
      return '*** ' + parts.slice(-2).join(' ')
      
    default:
      return text.slice(0, 2) + '***' + text.slice(-2)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { text, documentId, redactionMethod = 'Smart Placeholders' } = await req.json()
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const startTime = Date.now()
    
    // Detect PII entities
    const entities = detectPII(text)
    
    // Apply redaction
    const redactedText = applyRedaction(text, entities, redactionMethod)
    
    const processingTime = Date.now() - startTime
    const overallConfidence = entities.length > 0 
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
      : 1.0
    
    // If documentId is provided, store results in database
    if (documentId) {
      const { error: entitiesError } = await supabase
        .from('pii_entities')
        .delete()
        .eq('document_id', documentId)
      
      if (entitiesError) {
        console.error('Error deleting old entities:', entitiesError)
      }
      
      if (entities.length > 0) {
        const { error: insertError } = await supabase
          .from('pii_entities')
          .insert(
            entities.map(entity => ({
              document_id: documentId,
              entity_type: entity.type,
              text_content: entity.text,
              start_position: entity.start,
              end_position: entity.end,
              confidence_score: entity.confidence,
              risk_category: entity.category,
              context: entity.context
            }))
          )
        
        if (insertError) {
          console.error('Error inserting entities:', insertError)
        }
      }
      
      // Store processing result
      const { error: resultError } = await supabase
        .from('processing_results')
        .upsert({
          document_id: documentId,
          original_text: text,
          redacted_text: redactedText,
          redaction_method: redactionMethod,
          total_entities: entities.length,
          processing_time_ms: processingTime,
          overall_confidence: overallConfidence,
          metadata: {
            entityTypes: [...new Set(entities.map(e => e.type))],
            categoryCounts: entities.reduce((counts, e) => {
              counts[e.category] = (counts[e.category] || 0) + 1
              return counts
            }, {} as Record<string, number>)
          }
        })
      
      if (resultError) {
        console.error('Error storing result:', resultError)
      }
    }
    
    const result = {
      originalText: text,
      entities,
      redactedText,
      processingTime,
      confidence: overallConfidence,
      totalEntities: entities.length,
      entityCounts: entities.reduce((counts, e) => {
        counts[e.category] = (counts[e.category] || 0) + 1
        return counts
      }, {} as Record<string, number>)
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})