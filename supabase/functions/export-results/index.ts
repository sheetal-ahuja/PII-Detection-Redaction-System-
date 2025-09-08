import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

function generateCSVReport(entities: any[], result: any): string {
  const headers = ['Entity Type', 'Text Content', 'Position', 'Confidence', 'Risk Category', 'Context']
  const rows = entities.map(entity => [
    entity.entity_type,
    `"${entity.text_content.replace(/"/g, '""')}"`,
    `${entity.start_position}-${entity.end_position}`,
    entity.confidence_score,
    entity.risk_category,
    `"${(entity.context || '').replace(/"/g, '""')}"`
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  return csvContent
}

function generateJSONReport(entities: any[], result: any): string {
  return JSON.stringify({
    summary: {
      totalEntities: result.total_entities,
      processingTimeMs: result.processing_time_ms,
      confidence: result.overall_confidence,
      redactionMethod: result.redaction_method,
      createdAt: result.created_at
    },
    entities: entities.map(entity => ({
      type: entity.entity_type,
      text: entity.text_content,
      position: {
        start: entity.start_position,
        end: entity.end_position
      },
      confidence: entity.confidence_score,
      category: entity.risk_category,
      context: entity.context
    })),
    redactedText: result.redacted_text
  }, null, 2)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { documentId, format, userId } = await req.json()
    
    if (!documentId || !format || !userId) {
      return new Response(
        JSON.stringify({ error: 'documentId, format, and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get processing result
    const { data: result, error: resultError } = await supabase
      .from('processing_results')
      .select('*')
      .eq('document_id', documentId)
      .single()
    
    if (resultError || !result) {
      return new Response(
        JSON.stringify({ error: 'Processing result not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get entities
    const { data: entities, error: entitiesError } = await supabase
      .from('pii_entities')
      .select('*')
      .eq('document_id', documentId)
      .order('start_position')
    
    if (entitiesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entities' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    let fileContent: string
    let fileName: string
    let contentType: string
    
    switch (format.toLowerCase()) {
      case 'txt':
        fileContent = result.redacted_text
        fileName = `redacted-${Date.now()}.txt`
        contentType = 'text/plain'
        break
      case 'csv':
        fileContent = generateCSVReport(entities || [], result)
        fileName = `pii-report-${Date.now()}.csv`
        contentType = 'text/csv'
        break
      case 'json':
        fileContent = generateJSONReport(entities || [], result)
        fileName = `pii-analysis-${Date.now()}.json`
        contentType = 'application/json'
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported format. Use txt, csv, or json' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
    
    // Upload to exports bucket
    const exportPath = `${userId}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('processed-exports')
      .upload(exportPath, new Blob([fileContent], { type: contentType }))
    
    if (uploadError) {
      console.error('Export upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to create export file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Generate download URL
    const { data: urlData } = await supabase.storage
      .from('processed-exports')
      .createSignedUrl(exportPath, 3600) // 1 hour expiry
    
    return new Response(
      JSON.stringify({
        downloadUrl: urlData?.signedUrl,
        fileName,
        format,
        fileSize: new Blob([fileContent]).size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})