import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ExportOptions {
  format: 'pdf' | 'txt' | 'json' | 'csv' | 'docx' | 'xml';
  includeMetadata: boolean;
  includeStatistics: boolean;
  includeOriginalText: boolean;
  includeEntityDetails: boolean;
  customFilename?: string;
  notes?: string;
  confidenceThreshold: number;
  selectedCategories: string[];
}

interface ProcessingResult {
  originalText: string;
  entities: Array<{
    id: string;
    type: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
    category: 'high' | 'medium' | 'low';
  }>;
  redactedText: string;
  processingTime: number;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { format, options, result, userId } = await req.json() as {
      format: string;
      options: ExportOptions;
      result: ProcessingResult;
      userId: string;
    }
    
    if (!format || !result || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const defaultFilename = `pii-redaction-report-${result.entities.length}entities-${timestamp}`
    const filename = options?.customFilename || defaultFilename

    let content = ''
    let mimeType = 'text/plain'

    // Filter entities based on options
    const filteredEntities = result.entities.filter(entity => {
      const categoryMatch = !options?.selectedCategories?.length || 
        options.selectedCategories.includes(entity.category)
      const confidenceMatch = !options?.confidenceThreshold || 
        entity.confidence >= (options.confidenceThreshold / 100)
      return categoryMatch && confidenceMatch
    })

    const stats = {
      total: filteredEntities.length,
      high: filteredEntities.filter(e => e.category === 'high').length,
      medium: filteredEntities.filter(e => e.category === 'medium').length,
      low: filteredEntities.filter(e => e.category === 'low').length,
      avgConfidence: filteredEntities.length > 0 
        ? filteredEntities.reduce((sum, e) => sum + e.confidence, 0) / filteredEntities.length 
        : 0
    }

    switch (format) {
      case 'txt':
        content = generateTextReport(result, filteredEntities, options, stats)
        mimeType = 'text/plain'
        break

      case 'json':
        content = generateJSONReport(result, filteredEntities, options, stats)
        mimeType = 'application/json'
        break

      case 'csv':
        content = generateCSVReport(filteredEntities, options)
        mimeType = 'text/csv'
        break

      case 'xml':
        content = generateXMLReport(result, filteredEntities, options, stats)
        mimeType = 'application/xml'
        break

      case 'pdf':
      case 'docx':
        content = generateStructuredReport(result, filteredEntities, options, stats, format)
        mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break

      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    return new Response(
      JSON.stringify({
        content,
        filename: `${filename}.${format}`,
        mimeType,
        stats: {
          entitiesExported: filteredEntities.length,
          totalEntities: result.entities.length,
          processingTime: result.processingTime
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: 'Export failed: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateTextReport(
  result: ProcessingResult, 
  entities: any[], 
  options: ExportOptions, 
  stats: any
): string {
  let report = ''
  
  // Header
  report += '═══════════════════════════════════════════════════════════════\n'
  report += '                    PII REDACTION REPORT                      \n'
  report += '═══════════════════════════════════════════════════════════════\n\n'
  
  if (options.includeMetadata) {
    report += 'PROCESSING METADATA\n'
    report += '─────────────────────\n'
    report += `Generated: ${new Date().toLocaleString()}\n`
    report += `Processing Time: ${result.processingTime}ms\n`
    report += `Overall Confidence: ${Math.round(result.confidence * 100)}%\n`
    report += `Original Text Length: ${result.originalText.length} characters\n`
    if (options.notes) {
      report += `Notes: ${options.notes}\n`
    }
    report += '\n'
  }

  if (options.includeStatistics) {
    report += 'STATISTICAL SUMMARY\n'
    report += '─────────────────────\n'
    report += `Total Entities Found: ${stats.total}\n`
    report += `High Risk Entities: ${stats.high}\n`
    report += `Medium Risk Entities: ${stats.medium}\n`
    report += `Low Risk Entities: ${stats.low}\n`
    report += `Average Confidence: ${Math.round(stats.avgConfidence * 100)}%\n\n`
  }

  // Redacted text
  report += 'REDACTED TEXT\n'
  report += '─────────────────────\n'
  report += result.redactedText + '\n\n'

  if (options.includeEntityDetails && entities.length > 0) {
    report += 'DETECTED PII ENTITIES\n'
    report += '─────────────────────\n'
    
    entities.forEach((entity, index) => {
      report += `${index + 1}. ${entity.type}\n`
      report += `   Text: ${entity.text}\n`
      report += `   Position: ${entity.start}-${entity.end}\n`
      report += `   Confidence: ${Math.round(entity.confidence * 100)}%\n`
      report += `   Risk Level: ${entity.category.toUpperCase()}\n\n`
    })
  }

  if (options.includeOriginalText) {
    report += 'ORIGINAL TEXT (CONFIDENTIAL)\n'
    report += '─────────────────────────────\n'
    report += '⚠️  WARNING: This section contains unredacted PII\n\n'
    report += result.originalText + '\n\n'
  }

  report += '═══════════════════════════════════════════════════════════════\n'
  report += 'Report generated by PII Redaction System\n'
  report += '═══════════════════════════════════════════════════════════════\n'

  return report
}

function generateJSONReport(
  result: ProcessingResult, 
  entities: any[], 
  options: ExportOptions, 
  stats: any
): string {
  const report = {
    metadata: options.includeMetadata ? {
      generatedAt: new Date().toISOString(),
      processingTime: result.processingTime,
      overallConfidence: result.confidence,
      originalTextLength: result.originalText.length,
      notes: options.notes || null
    } : undefined,
    
    statistics: options.includeStatistics ? {
      totalEntities: stats.total,
      riskBreakdown: {
        high: stats.high,
        medium: stats.medium,
        low: stats.low
      },
      averageConfidence: stats.avgConfidence
    } : undefined,
    
    redactedText: result.redactedText,
    
    entities: options.includeEntityDetails ? entities.map(entity => ({
      id: entity.id,
      type: entity.type,
      text: entity.text,
      position: {
        start: entity.start,
        end: entity.end
      },
      confidence: entity.confidence,
      riskCategory: entity.category
    })) : undefined,
    
    originalText: options.includeOriginalText ? result.originalText : undefined
  }

  // Remove undefined fields
  Object.keys(report).forEach(key => {
    if (report[key as keyof typeof report] === undefined) {
      delete report[key as keyof typeof report]
    }
  })

  return JSON.stringify(report, null, 2)
}

function generateCSVReport(entities: any[], options: ExportOptions): string {
  let csv = 'Entity Type,Text Content,Start Position,End Position,Confidence Score,Risk Category\n'
  
  entities.forEach(entity => {
    const escapedText = `"${entity.text.replace(/"/g, '""')}"`
    csv += `${entity.type},${escapedText},${entity.start},${entity.end},${entity.confidence},${entity.category}\n`
  })
  
  return csv
}

function generateXMLReport(
  result: ProcessingResult, 
  entities: any[], 
  options: ExportOptions, 
  stats: any
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<PIIRedactionReport>\n'
  
  if (options.includeMetadata) {
    xml += '  <Metadata>\n'
    xml += `    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>\n`
    xml += `    <ProcessingTime>${result.processingTime}</ProcessingTime>\n`
    xml += `    <OverallConfidence>${result.confidence}</OverallConfidence>\n`
    xml += `    <OriginalTextLength>${result.originalText.length}</OriginalTextLength>\n`
    if (options.notes) {
      xml += `    <Notes><![CDATA[${options.notes}]]></Notes>\n`
    }
    xml += '  </Metadata>\n'
  }
  
  if (options.includeStatistics) {
    xml += '  <Statistics>\n'
    xml += `    <TotalEntities>${stats.total}</TotalEntities>\n`
    xml += `    <HighRiskEntities>${stats.high}</HighRiskEntities>\n`
    xml += `    <MediumRiskEntities>${stats.medium}</MediumRiskEntities>\n`
    xml += `    <LowRiskEntities>${stats.low}</LowRiskEntities>\n`
    xml += `    <AverageConfidence>${stats.avgConfidence}</AverageConfidence>\n`
    xml += '  </Statistics>\n'
  }
  
  xml += '  <RedactedText><![CDATA[' + result.redactedText + ']]></RedactedText>\n'
  
  if (options.includeEntityDetails && entities.length > 0) {
    xml += '  <DetectedEntities>\n'
    entities.forEach(entity => {
      xml += '    <Entity>\n'
      xml += `      <Type>${entity.type}</Type>\n`
      xml += `      <Text><![CDATA[${entity.text}]]></Text>\n`
      xml += `      <StartPosition>${entity.start}</StartPosition>\n`
      xml += `      <EndPosition>${entity.end}</EndPosition>\n`
      xml += `      <Confidence>${entity.confidence}</Confidence>\n`
      xml += `      <RiskCategory>${entity.category}</RiskCategory>\n`
      xml += '    </Entity>\n'
    })
    xml += '  </DetectedEntities>\n'
  }
  
  if (options.includeOriginalText) {
    xml += '  <OriginalText><![CDATA[' + result.originalText + ']]></OriginalText>\n'
  }
  
  xml += '</PIIRedactionReport>\n'
  
  return xml
}

function generateStructuredReport(
  result: ProcessingResult, 
  entities: any[], 
  options: ExportOptions, 
  stats: any,
  format: string
): string {
  // For demo purposes, return a structured text representation
  // In production, you would use libraries like PDFKit for PDF or officegen for DOCX
  
  let report = ''
  
  if (format === 'pdf') {
    report += '%PDF-1.4\n% Mock PDF content for demonstration\n'
  } else {
    report += 'PK\x03\x04\x14\x00\x00\x00\x08\x00\n% Mock DOCX content for demonstration\n'
  }
  
  report += '\n=== PII REDACTION REPORT ===\n\n'
  report += generateTextReport(result, entities, options, stats)
  
  return report
}