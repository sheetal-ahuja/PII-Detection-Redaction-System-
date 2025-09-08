import React, { useState } from 'react';
import { Eye, EyeOff, Shield, AlertTriangle, Info, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PIIEntity, ProcessingResult, RedactionMethod } from '@/types/pii';
import { cn } from '@/lib/utils';
import { SlidingRevealComparison } from '@/components/SlidingRevealComparison';

interface PIIResultsProps {
  result: ProcessingResult;
  redactionMethods: RedactionMethod[];
  selectedMethod: string;
  onMethodChange: (methodId: string) => void;
  onExport: (format: 'pdf' | 'txt') => void;
}

export const PIIResults: React.FC<PIIResultsProps> = ({
  result,
  redactionMethods,
  selectedMethod,
  onMethodChange,
  onExport
}) => {
  const [showOriginal, setShowOriginal] = useState(false);

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

  const highlightPII = (text: string, entities: PIIEntity[]) => {
    if (!entities.length) return text;

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity, index) => {
      // Add text before entity
      if (entity.start > lastIndex) {
        parts.push(text.slice(lastIndex, entity.start));
      }

      // Add highlighted entity
      parts.push(
        <span
          key={`entity-${index}`}
          className={cn(
            'pii-highlight inline-flex items-center gap-1',
            entity.category === 'high' && 'pii-high',
            entity.category === 'medium' && 'pii-medium',
            entity.category === 'low' && 'pii-low'
          )}
        >
          {getConfidenceIcon(entity.category)}
          {entity.text}
        </span>
      );

      lastIndex = entity.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const entityCounts = result.entities.reduce((acc, entity) => {
    acc[entity.category] = (acc[entity.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Processing Summary */}
      <Card className="card-gradient card-elevated">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-card-foreground">
                PII Analysis Complete
              </h2>
              <p className="text-muted-foreground">
                Processed in {result.processingTime}ms with {result.confidence}% confidence
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('txt')}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-card-foreground">
                {result.entities.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Entities</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="text-2xl font-bold text-red-600">
                {entityCounts.high || 0}
              </div>
              <div className="text-sm text-red-600">High Risk</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <div className="text-2xl font-bold text-orange-600">
                {entityCounts.medium || 0}
              </div>
              <div className="text-sm text-orange-600">Medium Risk</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="text-2xl font-bold text-green-600">
                {entityCounts.low || 0}
              </div>
              <div className="text-sm text-green-600">Low Risk</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Redaction Configuration */}
      <Card className="card-gradient">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Redaction Method
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {redactionMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => onMethodChange(method.id)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all hover:shadow-md',
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="font-medium text-card-foreground mb-1">
                  {method.name}
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {method.description}
                </div>
                <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                  {method.example}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Text Comparison */}
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">Side by Side</TabsTrigger>
          <TabsTrigger value="sliding">Sliding Reveal</TabsTrigger>
          <TabsTrigger value="entities">Entity Details</TabsTrigger>
          <TabsTrigger value="redacted">Redacted Only</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="card-gradient">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-card-foreground">Original Text</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="gap-2"
                  >
                    {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showOriginal ? 'Hide PII' : 'Show PII'}
                  </Button>
                </div>
              </div>
              <div className="p-4 max-h-96 overflow-auto">
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {showOriginal 
                    ? highlightPII(result.originalText, result.entities)
                    : result.originalText
                  }
                </div>
              </div>
            </Card>

            <Card className="card-gradient">
              <div className="p-4 border-b border-border/50">
                <h4 className="font-medium text-card-foreground">Redacted Text</h4>
              </div>
              <div className="p-4 max-h-96 overflow-auto">
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-card-foreground">
                  {result.redactedText}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sliding" className="space-y-4">
          <Card className="card-gradient">
            <div className="p-4 border-b border-border/50">
              <h4 className="font-medium text-card-foreground">Interactive Sliding Comparison</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Drag the divider to reveal redacted content and compare with original text
              </p>
            </div>
            <div className="p-4">
              <SlidingRevealComparison
                originalText={result.originalText}
                redactedText={result.redactedText}
                entities={result.entities}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <Card className="card-gradient">
            <div className="p-6">
              <div className="space-y-4">
                {result.entities.map((entity, index) => (
                  <div
                    key={`${entity.id}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/25"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={getEntityBadgeVariant(entity.category)} className="gap-1">
                        {getConfidenceIcon(entity.category)}
                        {entity.type}
                      </Badge>
                      <span className="font-mono text-sm">{entity.text}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-card-foreground">
                          {Math.round(entity.confidence * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Position {entity.start}-{entity.end}
                        </div>
                      </div>
                      <Progress value={entity.confidence * 100} className="w-16 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="redacted">
          <Card className="card-gradient">
            <div className="p-6">
              <div className="max-h-96 overflow-auto">
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-card-foreground">
                  {result.redactedText}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};