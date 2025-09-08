import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  FileText, 
  Upload, 
  Download, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  LogOut,
  Activity,
  Users
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { AdvancedFileUpload } from './AdvancedFileUpload'
import { Footer } from './Footer'
import { EnhancedPIIResults } from './EnhancedPIIResults'
import { useToast } from '@/hooks/use-toast'
import { extractTextWithOCR, detectEnhancedPII } from '@/utils/ocrProcessor'
import { getPersonEntities } from '@/utils/ner'
import type { ProcessingResult, RedactionMethod, UploadedFile } from '@/types/pii'

interface DashboardStats {
  totalDocuments: number
  totalEntities: number
  recentProcessing: number
  highRiskEntities: number
}

export function Dashboard() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalEntities: 0,
    recentProcessing: 0,
    highRiskEntities: 0
  })
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('Smart Placeholders')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeNavTab, setActiveNavTab] = useState('upload')

  const redactionMethods: RedactionMethod[] = [
    {
      id: 'smart-placeholders',
      name: 'Smart Placeholders',
      description: 'Replace PII with contextual placeholders',
      icon: Shield,
      enabled: true
    },
    {
      id: 'complete-removal',
      name: 'Complete Removal',
      description: 'Remove all PII entities completely',
      icon: Shield,
      enabled: true
    },
    {
      id: 'tokenization',
      name: 'Tokenization',
      description: 'Replace with secure tokens',
      icon: Shield,
      enabled: true
    },
    {
      id: 'masking',
      name: 'Partial Masking',
      description: 'Show only partial information',
      icon: Shield,
      enabled: true
    }
  ]

  // Handle direct text processing
  const handleTextSubmit = async (text: string) => {
    if (!text.trim()) {
      toast({
        title: 'No Text Provided',
        description: 'Please enter some text to analyze.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    console.log('Processing text:', text.substring(0, 100) + '...')
    
    try {
      // Run regex-based PII detection and NER person detection in parallel
      const [regexEntities, nerPersons] = await Promise.all([
        Promise.resolve(detectEnhancedPII(text)),
        getPersonEntities(text)
      ])

      // Map NER PERSON to unified entity shape (type = 'NAME')
      const nerNameEntities = nerPersons.map((p, idx) => {
        const confidence = p.confidence
        const category = confidence >= 0.9 ? 'high' : confidence >= 0.8 ? 'medium' : 'low'
        return {
          id: `name_${idx + 1}`,
          type: 'NAME',
          text: p.text,
          start: p.start,
          end: p.end,
          confidence,
          category
        }
      })

      // Merge and de-duplicate by exact span
      const spanKey = (e: any) => `${e.start}-${e.end}`
      const mergedMap = new Map<string, any>()
      ;[...regexEntities, ...nerNameEntities].forEach(e => {
        if (!mergedMap.has(spanKey(e))) mergedMap.set(spanKey(e), e)
      })
      const entities = Array.from(mergedMap.values())
      console.log('Detected entities (with NER):', entities)

      // Apply redaction with sequential numbering for NAME placeholders
      let redactedText = text
      // Assign NAME_x indices in order of appearance
      const nameEntitiesInOrder = entities
        .filter((e: any) => e.type === 'NAME')
        .sort((a: any, b: any) => a.start - b.start)
      const nameIndexMap = new Map<string, number>()
      nameEntitiesInOrder.forEach((e: any, i: number) => {
        nameIndexMap.set(`${e.start}-${e.end}`, i + 1)
      })

      const sortedEntities = [...entities].sort((a: any, b: any) => b.start - a.start)
      
      sortedEntities.forEach((entity: any) => {
        const before = redactedText.substring(0, entity.start)
        const after = redactedText.substring(entity.end)
        let replacement = ''
        
        switch (selectedMethod) {
          case 'Smart Placeholders':
          default: {
            if (entity.type === 'NAME') {
              const idx = nameIndexMap.get(`${entity.start}-${entity.end}`) || 1
              replacement = `[NAME_${idx}]`
            } else {
              replacement = `[${entity.type}]`
            }
            break
          }
          case 'Complete Removal':
            replacement = ''
            break
          case 'Tokenization':
            replacement = `TOKEN_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
            break
          case 'Masking':
            replacement = '*'.repeat(Math.min(entity.text.length, 8))
            break
        }
        
        redactedText = before + replacement + after
      })

      // Calculate stats
      const highRiskEntities = entities.filter(e => e.category === 'high').length
      const mediumRiskEntities = entities.filter(e => e.category === 'medium').length
      const lowRiskEntities = entities.filter(e => e.category === 'low').length
      
      const averageConfidence = entities.length > 0 
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
        : 0

        const result: ProcessingResult = {
          originalText: text,
          redactedText,
          entities,
          method: selectedMethod,
          confidence: averageConfidence,
          timestamp: new Date().toISOString(),
          processingTime: 100, // Add missing field
          stats: {
            totalEntities: entities.length,
            highRiskEntities,
            mediumRiskEntities,
            lowRiskEntities,
            averageConfidence
          }
        }

      setProcessingResult(result)
      setStats(prev => ({
        ...prev,
        totalDocuments: prev.totalDocuments + 1,
        totalEntities: prev.totalEntities + entities.length,
        recentProcessing: prev.recentProcessing + 1,
        highRiskEntities: prev.highRiskEntities + highRiskEntities
      }))
      
      toast({
        title: 'Processing Complete',
        description: `Found ${entities.length} PII entities with ${Math.round(averageConfidence * 100)}% average confidence.`,
      })
    } catch (error) {
      console.error('Processing error:', error)
      toast({
        title: 'Processing Failed',
        description: 'There was an error processing your text. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle file upload with OCR
  const handleFileUpload = async (files: File[]) => {
    if (!files || files.length === 0) return

    const file = files[0]
    setIsProcessing(true)
    
    try {
      toast({
        title: 'Processing File',
        description: `Extracting text from ${file.name} using OCR...`,
      })

      // Extract text using OCR
      const ocrResult = await extractTextWithOCR(file)
      console.log('OCR Result:', ocrResult)

      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        throw new Error('No text could be extracted from the file')
      }

      // Process the extracted text
      await handleTextSubmit(ocrResult.text)
      
      toast({
        title: 'OCR Complete',
        description: `Text extracted with ${Math.round(ocrResult.confidence * 100)}% confidence using ${ocrResult.method}.`,
      })
    } catch (error) {
      console.error('OCR error:', error)
      toast({
        title: 'OCR Failed',
        description: error instanceof Error ? error.message : 'Failed to extract text from file.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSignOut = async () => {
    console.log('Signing out user')
    await signOut()
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    })
  }

  // Show results if available
  if (processingResult) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <EnhancedPIIResults
            result={processingResult}
            redactionMethods={redactionMethods}
            selectedMethod={selectedMethod}
            onMethodChange={setSelectedMethod}
            onExport={(format) => {
              if (format === 'txt') {
                const blob = new Blob([processingResult.redactedText], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'redacted-text.txt'
                a.click()
                URL.revokeObjectURL(url)
              } else if (format === 'json') {
                const data = {
                  ...processingResult,
                  exportedAt: new Date().toISOString()
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'pii-analysis-results.json'
                a.click()
                URL.revokeObjectURL(url)
              } else if (format === 'csv') {
                const header = ['type','text','confidence','category','start','end']
                const rows = processingResult.entities.map(e => [
                  e.type,
                  '"' + e.text.replace(/"/g, '""') + '"',
                  Math.round(e.confidence * 100) + '%',
                  e.category,
                  e.start,
                  e.end
                ].join(','))
                const csv = [header.join(','), ...rows].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'pii-entities.csv'
                a.click()
                URL.revokeObjectURL(url)
              } else if (format === 'pdf') {
                const doc = new jsPDF({ unit: 'pt', format: 'a4' })
                const margin = 40
                let y = margin
                doc.setFont('helvetica','bold')
                doc.setFontSize(16)
                doc.text('PII Redaction Report', margin, y)
                y += 24
                doc.setFont('helvetica','normal')
                doc.setFontSize(10)
                doc.text(`Date: ${new Date().toLocaleString()}`, margin, y)
                y += 18
                doc.text(`Method: ${processingResult.method} | Entities: ${processingResult.entities.length} | Avg Confidence: ${Math.round(processingResult.confidence * 100)}%`, margin, y, { maxWidth: 515 })
                y += 28
                doc.setFont('helvetica','bold')
                doc.text('Redacted Text', margin, y)
                y += 16
                doc.setFont('helvetica','normal')
                const redactedLines = doc.splitTextToSize(processingResult.redactedText, 515)
                redactedLines.forEach(line => {
                  if (y > 760) { doc.addPage(); y = margin }
                  doc.text(line, margin, y)
                  y += 14
                })
                y += 10
                doc.setFont('helvetica','bold')
                doc.text('Entities', margin, y)
                y += 16
                doc.setFont('helvetica','normal')
                processingResult.entities.slice(0, 200).forEach(e => {
                  if (y > 760) { doc.addPage(); y = margin }
                  const line = `${e.type} • ${e.category.toUpperCase()} • ${Math.round(e.confidence * 100)}% — ${e.text}`
                  const wrapped = doc.splitTextToSize(line, 515)
                  wrapped.forEach(w => {
                    if (y > 760) { doc.addPage(); y = margin }
                    doc.text(w, margin, y)
                    y += 14
                  })
                })
                doc.save('pii-redaction-report.pdf')
              }
            }}
            onBack={() => setProcessingResult(null)}
          />
        </div>
        
        <Footer />
      </div>
    )
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary">
                PII Guardian
              </h1>
              <p className="text-sm text-muted-foreground">Advanced Document Redaction</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Premium Account</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Documents Processed</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalDocuments}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">PII Entities Found</p>
                  <p className="text-3xl font-bold text-orange-500">{stats.totalEntities}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Processing</p>
                  <p className="text-3xl font-bold text-blue-500">{stats.recentProcessing}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Risk Items</p>
                  <p className="text-3xl font-bold text-destructive">{stats.highRiskEntities}</p>
                </div>
                <Shield className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload & Process
            </TabsTrigger>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Redaction Methods
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card className="card-gradient card-elevated">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Document Processing with OCR
                </CardTitle>
                <CardDescription>
                  Upload documents or paste text for advanced PII detection and redaction with OCR support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdvancedFileUpload
                  onFileUpload={handleFileUpload}
                  onTextSubmit={handleTextSubmit}
                  isProcessing={isProcessing}
                  selectedMethod={selectedMethod}
                  onMethodChange={setSelectedMethod}
                  redactionMethods={redactionMethods}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methods" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {redactionMethods.map((method) => (
                <Card key={method.id} className={`card-elevated cursor-pointer transition-all hover:scale-105 ${
                  selectedMethod === method.name ? 'ring-2 ring-primary' : ''
                }`} onClick={() => setSelectedMethod(method.name)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <method.icon className="h-5 w-5 text-primary" />
                      {method.name}
                      {selectedMethod === method.name && (
                        <Badge variant="default" className="ml-auto">Selected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Processing Analytics
                </CardTitle>
                <CardDescription>
                  Real-time insights into your document processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Analytics data will appear here after processing documents</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  )
}