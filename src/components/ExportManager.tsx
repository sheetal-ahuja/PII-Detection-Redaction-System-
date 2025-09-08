import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Database, Share2, Settings, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProcessingResult } from '@/types/pii';
import { useToast } from '@/hooks/use-toast';

interface ExportManagerProps {
  result: ProcessingResult;
  onExport: (format: string, options: ExportOptions) => void;
}

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

const EXPORT_FORMATS = {
  pdf: {
    icon: FileText,
    label: 'PDF Document',
    description: 'Professional report with formatting and charts',
    color: 'text-red-500',
    recommended: true
  },
  txt: {
    icon: FileText,
    label: 'Plain Text',
    description: 'Simple text file with redacted content',
    color: 'text-blue-500',
    recommended: false
  },
  json: {
    icon: Database,
    label: 'JSON Data',
    description: 'Structured data for API integration',
    color: 'text-green-500',
    recommended: false
  },
  csv: {
    icon: FileSpreadsheet,
    label: 'CSV Report',
    description: 'Spreadsheet-compatible entity data',
    color: 'text-orange-500',
    recommended: false
  },
  docx: {
    icon: FileText,
    label: 'Word Document',
    description: 'Editable document with comments',
    color: 'text-blue-600',
    recommended: false
  },
  xml: {
    icon: Database,
    label: 'XML Data',
    description: 'Structured markup for system integration',
    color: 'text-purple-500',
    recommended: false
  }
};

export const ExportManager: React.FC<ExportManagerProps> = ({
  result,
  onExport
}) => {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<keyof typeof EXPORT_FORMATS>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeMetadata: true,
    includeStatistics: true,
    includeOriginalText: false,
    includeEntityDetails: true,
    confidenceThreshold: 0,
    selectedCategories: ['high', 'medium', 'low'],
    customFilename: '',
    notes: ''
  });

  const handleExport = () => {
    const options = {
      ...exportOptions,
      format: selectedFormat
    };

    onExport(selectedFormat, options);

    toast({
      title: 'Export Started',
      description: `Generating ${EXPORT_FORMATS[selectedFormat].label} file...`,
    });
  };

  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (category: string) => {
    setExportOptions(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category]
    }));
  };

  const generateDefaultFilename = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const entityCount = result.entities.length;
    return `pii-redaction-report-${entityCount}entities-${timestamp}`;
  };

  const entityStats = result.entities.reduce((acc, entity) => {
    acc[entity.category] = (acc[entity.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Export Format Selection */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Format
          </CardTitle>
          <CardDescription>
            Choose the format that best suits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EXPORT_FORMATS).map(([format, config]) => {
              const IconComponent = config.icon;
              const isSelected = selectedFormat === format;
              
              return (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format as keyof typeof EXPORT_FORMATS)}
                  className={`relative p-4 rounded-lg border text-left transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-glow'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {config.recommended && (
                    <Badge className="absolute -top-2 -right-2 bg-gradient-primary text-xs">
                      Recommended
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent className={`h-5 w-5 ${config.color}`} />
                    <h3 className="font-medium text-card-foreground">
                      {config.label}
                    </h3>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Export Options
          </CardTitle>
          <CardDescription>
            Customize what information to include in your export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-card-foreground">Content Inclusion</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) => updateOption('includeMetadata', !!checked)}
                  />
                  <Label htmlFor="metadata" className="text-sm">
                    Document metadata and processing info
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="statistics"
                    checked={exportOptions.includeStatistics}
                    onCheckedChange={(checked) => updateOption('includeStatistics', !!checked)}
                  />
                  <Label htmlFor="statistics" className="text-sm">
                    Statistical analysis and charts
                  </Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="original"
                    checked={exportOptions.includeOriginalText}
                    onCheckedChange={(checked) => updateOption('includeOriginalText', !!checked)}
                  />
                  <Label htmlFor="original" className="text-sm">
                    Original text (use with caution)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="entities"
                    checked={exportOptions.includeEntityDetails}
                    onCheckedChange={(checked) => updateOption('includeEntityDetails', !!checked)}
                  />
                  <Label htmlFor="entities" className="text-sm">
                    Detailed entity information
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-card-foreground">Risk Categories</h4>
            <div className="flex gap-4">
              {['high', 'medium', 'low'].map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={exportOptions.selectedCategories.includes(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <Label htmlFor={`category-${category}`} className="text-sm capitalize">
                    {category} Risk ({entityStats[category] || 0})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label htmlFor="confidence" className="text-sm font-medium">
              Minimum Confidence Threshold: {exportOptions.confidenceThreshold}%
            </Label>
            <Input
              type="range"
              min="0"
              max="100"
              step="5"
              value={exportOptions.confidenceThreshold}
              onChange={(e) => updateOption('confidenceThreshold', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% (All entities)</span>
              <span>100% (Highest confidence only)</span>
            </div>
          </div>

          {/* Custom Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename" className="text-sm font-medium">
              Custom Filename (optional)
            </Label>
            <Input
              id="filename"
              value={exportOptions.customFilename}
              onChange={(e) => updateOption('customFilename', e.target.value)}
              placeholder={generateDefaultFilename()}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Export Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={exportOptions.notes}
              onChange={(e) => updateOption('notes', e.target.value)}
              placeholder="Add any notes or context for this export..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Export Summary */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Export Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-card-foreground">
                {result.entities.filter(e => 
                  exportOptions.selectedCategories.includes(e.category) &&
                  e.confidence >= exportOptions.confidenceThreshold / 100
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Entities to Export</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-card-foreground">
                {EXPORT_FORMATS[selectedFormat].label}
              </div>
              <div className="text-sm text-muted-foreground">Export Format</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-card-foreground">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">Export Date</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Filename: {exportOptions.customFilename || generateDefaultFilename()}.{selectedFormat}
            </div>
            
            <Button 
              onClick={handleExport}
              className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
            >
              <Download className="h-4 w-4" />
              Export {EXPORT_FORMATS[selectedFormat].label}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};