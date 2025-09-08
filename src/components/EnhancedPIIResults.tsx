import React, { useState, useMemo } from 'react';
import { 
  Eye, EyeOff, Shield, AlertTriangle, Info, Download, Filter, 
  Search, BarChart3, FileText, Copy, Share2, Settings, 
  CheckSquare, Square, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PIIEntity, ProcessingResult, RedactionMethod } from '@/types/pii';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SlidingRevealComparison } from '@/components/SlidingRevealComparison';

interface EnhancedPIIResultsProps {
  result: ProcessingResult;
  redactionMethods: RedactionMethod[];
  selectedMethod: string;
  onMethodChange: (methodId: string) => void;
  onExport: (format: 'pdf' | 'txt' | 'json' | 'csv') => void;
  onBack: () => void;
}

export const EnhancedPIIResults: React.FC<EnhancedPIIResultsProps> = ({
  result,
  redactionMethods,
  selectedMethod,
  onMethodChange,
  onExport,
  onBack
}) => {
  const { toast } = useToast();
  const [showOriginal, setShowOriginal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [showConfidenceThreshold, setShowConfidenceThreshold] = useState(0);

  // Enhanced redaction methods with descriptions
  const enhancedRedactionMethods = [
    {
      id: 'Smart Placeholders',
      name: 'Smart Placeholders',
      description: 'Replace with structured placeholders that maintain entity relationships',
      example: '[EMAIL_01], [PERSON_02]',
      icon: <Settings className="h-4 w-4" />,
      recommended: true
    },
    {
      id: 'Contextual Masking',
      name: 'Contextual Masking',
      description: 'Intelligent masking that preserves data structure and partial information',
      example: 'j███@company.com, (XXX) XXX-1234',
      icon: <Eye className="h-4 w-4" />,
      recommended: false
    },
    {
      id: 'Synthetic Data',
      name: 'Synthetic Data',
      description: 'Replace with realistic fake data that maintains document readability',
      example: 'John Doe, user@example.com',
      icon: <Zap className="h-4 w-4" />,
      recommended: false
    },
    {
      id: 'Cryptographic Hash',
      name: 'Cryptographic Hash',
      description: 'Irreversible hash-based replacement for maximum security',
      example: '[HASH_EMAIL_A7B9C2D1]',
      icon: <Shield className="h-4 w-4" />,
      recommended: false
    },
    {
      id: 'Partial Visibility',
      name: 'Partial Visibility',
      description: 'Show partial information for verification while maintaining privacy',
      example: 'John D***, j***@company.com',
      icon: <EyeOff className="h-4 w-4" />,
      recommended: false
    }
  ];

  // Filter entities based on search and filters
  const filteredEntities = useMemo(() => {
    return result.entities.filter(entity => {
      const matchesSearch = searchTerm === '' || 
        entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || entity.category === filterCategory;
      const matchesType = filterType === 'all' || entity.type === filterType;
      const matchesConfidence = entity.confidence >= showConfidenceThreshold / 100;
      
      return matchesSearch && matchesCategory && matchesType && matchesConfidence;
    });
  }, [result.entities, searchTerm, filterCategory, filterType, showConfidenceThreshold]);

  // Get unique entity types for filter
  const entityTypes = useMemo(() => {
    return Array.from(new Set(result.entities.map(e => e.type)));
  }, [result.entities]);

  const getEntityBadgeVariant = (category: PIIEntity['category']) => {
    switch (category) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getConfidenceIcon = (category: PIIEntity['category']) => {
    switch (category) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <Info className="h-3 w-3" />;
      case 'low': return <Shield className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const highlightPII = (text: string, entities: PIIEntity[], showHighlight: boolean = true) => {
    if (!entities.length || !showHighlight) return text;

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity, index) => {
      if (entity.start > lastIndex) {
        parts.push(text.slice(lastIndex, entity.start));
      }

      const isSelected = selectedEntities.has(entity.id);
      parts.push(
        <span
          key={`entity-${index}`}
          className={cn(
            'pii-highlight inline-flex items-center gap-1 cursor-pointer transition-all',
            entity.category === 'high' && 'pii-high',
            entity.category === 'medium' && 'pii-medium',
            entity.category === 'low' && 'pii-low',
            isSelected && 'ring-2 ring-primary ring-offset-1'
          )}
          onClick={() => toggleEntitySelection(entity.id)}
          title={`${entity.type} (${Math.round(entity.confidence * 100)}% confidence)`}
        >
          {getConfidenceIcon(entity.category)}
          {entity.text}
        </span>
      );

      lastIndex = entity.end;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const toggleEntitySelection = (entityId: string) => {
    setSelectedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const selectAllEntities = () => {
    setSelectedEntities(new Set(filteredEntities.map(e => e.id)));
  };

  const deselectAllEntities = () => {
    setSelectedEntities(new Set());
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        description: 'Text has been copied to your clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy text to clipboard.',
        variant: 'destructive',
      });
    }
  };

  // Statistics calculations
  const stats = useMemo(() => {
    const entityCounts = result.entities.reduce((acc, entity) => {
      acc[entity.category] = (acc[entity.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = result.entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: result.entities.length,
      high: entityCounts.high || 0,
      medium: entityCounts.medium || 0,
      low: entityCounts.low || 0,
      avgConfidence: result.entities.length > 0 
        ? result.entities.reduce((sum, e) => sum + e.confidence, 0) / result.entities.length 
        : 0,
      topTypes: Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }, [result.entities]);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card className="card-gradient card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                PII Analysis Complete
              </CardTitle>
              <CardDescription className="text-base">
                Processed {result.originalText.length.toLocaleString()} characters in {result.processingTime}ms 
                with {Math.round(result.confidence * 100)}% overall confidence
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onBack}>
                Back to Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(result.redactedText)}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Select onValueChange={(format) => onExport(format as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="txt">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      TXT
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-card-foreground">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Entities</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="text-2xl font-bold text-red-600">
                {stats.high}
              </div>
              <div className="text-sm text-red-600">High Risk</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <div className="text-2xl font-bold text-orange-600">
                {stats.medium}
              </div>
              <div className="text-sm text-orange-600">Medium Risk</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="text-2xl font-bold text-green-600">
                {stats.low}
              </div>
              <div className="text-sm text-green-600">Low Risk</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(stats.avgConfidence * 100)}%
              </div>
              <div className="text-sm text-blue-600">Avg Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redaction Method Selection */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Redaction Method Configuration
          </CardTitle>
          <CardDescription>
            Choose how PII entities should be redacted in the final output
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enhancedRedactionMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => onMethodChange(method.id)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all hover:shadow-md relative',
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {method.recommended && (
                  <Badge className="absolute -top-2 -right-2 bg-gradient-primary">
                    Recommended
                  </Badge>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  {method.icon}
                  <h3 className="font-medium text-card-foreground">
                    {method.name}
                  </h3>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {method.description}
                </p>
                
                <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                  {method.example}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="comparison">Text Comparison</TabsTrigger>
          <TabsTrigger value="sliding">Sliding Reveal</TabsTrigger>
          <TabsTrigger value="entities">Entity Analysis</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
          <TabsTrigger value="redacted">Final Output</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="card-gradient">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Original Text</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="gap-2"
                  >
                    {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showOriginal ? 'Hide PII' : 'Highlight PII'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto p-4 bg-muted/20 rounded-lg">
                  <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                    {highlightPII(result.originalText, result.entities, showOriginal)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Redacted Text</CardTitle>
                  <Badge variant="outline">{selectedMethod}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto p-4 bg-muted/20 rounded-lg">
                  <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-card-foreground">
                    {result.redactedText}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sliding" className="space-y-4">
          <Card className="card-gradient">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Interactive Sliding Comparison</CardTitle>
              <CardDescription>
                Drag the divider to reveal redacted content and compare with original text. 
                Original text (left) shows PII highlighted, redacted text (right) shows final output.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SlidingRevealComparison
                originalText={result.originalText}
                redactedText={result.redactedText}
                entities={result.entities}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          {/* Filters and Search */}
          <Card className="card-gradient">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {entityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Confidence ≥
                  </span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={showConfidenceThreshold}
                    onChange={(e) => setShowConfidenceThreshold(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredEntities.length} of {result.entities.length} entities
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllEntities}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllEntities}>
                    <Square className="h-4 w-4 mr-2" />
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entity List */}
          <Card className="card-gradient">
            <CardContent className="pt-6">
              <div className="space-y-3 max-h-96 overflow-auto">
                {filteredEntities.map((entity, index) => {
                  const isSelected = selectedEntities.has(entity.id);
                  return (
                    <div
                      key={`${entity.id}-${index}`}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 bg-muted/25 hover:bg-muted/50"
                      )}
                      onClick={() => toggleEntitySelection(entity.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => toggleEntitySelection(entity.id)}
                      />
                      
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant={getEntityBadgeVariant(entity.category)} className="gap-1">
                          {getConfidenceIcon(entity.category)}
                          {entity.type}
                        </Badge>
                        
                        <span className="font-mono text-sm flex-1">{entity.text}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={cn("text-sm font-medium", getConfidenceColor(entity.confidence))}>
                            {Math.round(entity.confidence * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Position {entity.start}-{entity.end}
                          </div>
                        </div>
                        <Progress value={entity.confidence * 100} className="w-16 h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-gradient">
              <CardHeader>
                <CardTitle>Entity Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topTypes.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{type}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(count / stats.total) * 100} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground min-w-[2rem]">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-gradient">
              <CardHeader>
                <CardTitle>Processing Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold text-card-foreground">
                      {result.processingTime}ms
                    </div>
                    <div className="text-xs text-muted-foreground">Processing Time</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold text-card-foreground">
                      {Math.round((result.originalText.length / result.processingTime) * 1000).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Chars/sec</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Text Coverage</span>
                    <span className="text-sm font-medium">
                      {Math.round((result.entities.reduce((sum, e) => sum + (e.end - e.start), 0) / result.originalText.length) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Entity Density</span>
                    <span className="text-sm font-medium">
                      {(result.entities.length / (result.originalText.split(' ').length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="redacted">
          <Card className="card-gradient">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Final Redacted Output</CardTitle>
                  <CardDescription>
                    Ready for sharing or further processing using {selectedMethod} method
                  </CardDescription>
                </div>
                <Button
                  onClick={() => copyToClipboard(result.redactedText)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto p-4 bg-muted/20 rounded-lg">
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-card-foreground">
                  {result.redactedText}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};