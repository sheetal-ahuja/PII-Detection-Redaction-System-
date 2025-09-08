import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PIIEntity } from '@/types/pii';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, Shield } from 'lucide-react';

interface SlidingRevealComparisonProps {
  originalText: string;
  redactedText: string;
  entities: PIIEntity[];
  className?: string;
}

export const SlidingRevealComparison: React.FC<SlidingRevealComparisonProps> = ({
  originalText,
  redactedText,
  entities,
  className
}) => {
  const [revealPercentage, setRevealPercentage] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (entity.start > lastIndex) {
        parts.push(text.slice(lastIndex, entity.start));
      }

      parts.push(
        <span
          key={`entity-${index}`}
          className={cn(
            'pii-highlight inline-flex items-center gap-1',
            entity.category === 'high' && 'pii-high',
            entity.category === 'medium' && 'pii-medium',
            entity.category === 'low' && 'pii-low'
          )}
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const percentage = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
    setRevealPercentage(percentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const percentage = Math.min(Math.max(((touch.clientX - rect.left) / rect.width) * 100, 0), 100);
    setRevealPercentage(percentage);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={cn("relative h-96 overflow-hidden rounded-lg border border-border", className)}>
      <div ref={containerRef} className="relative h-full w-full select-none">
        {/* Original Text Layer (Left Side - Behind Curtain) */}
        <div 
          className="absolute inset-0 p-4 bg-muted/20"
          style={{
            clipPath: `polygon(0 0, ${revealPercentage}% 0, ${revealPercentage}% 100%, 0 100%)`
          }}
        >
          <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap h-full overflow-auto">
            {highlightPII(originalText, entities)}
          </div>
        </div>

        {/* Redacted Text Layer (Right Side - Revealed Area) */}
        <div 
          className="absolute inset-0 p-4 bg-background"
          style={{
            clipPath: `polygon(${revealPercentage}% 0, 100% 0, 100% 100%, ${revealPercentage}% 100%)`
          }}
        >
          <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap h-full overflow-auto text-card-foreground">
            {redactedText}
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className={cn(
            "absolute top-0 bottom-0 w-1 bg-primary cursor-col-resize transform -translate-x-1/2 transition-shadow",
            isDragging && "shadow-lg shadow-primary/50"
          )}
          style={{ left: `${revealPercentage}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Drag Handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full shadow-lg flex items-center justify-center">
            <div className="w-1 h-4 bg-primary-foreground rounded-full mx-0.5"></div>
            <div className="w-1 h-4 bg-primary-foreground rounded-full mx-0.5"></div>
          </div>
        </div>

        {/* Curtain Shadow Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent ${Math.max(revealPercentage - 2, 0)}%, rgba(0,0,0,0.1) ${revealPercentage}%, transparent ${Math.min(revealPercentage + 2, 100)}%)`
          }}
        />
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-4 text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded">
        Original
      </div>
      <div className="absolute top-2 right-4 text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded">
        Redacted
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground bg-background/90 px-3 py-1 rounded-full">
        Drag to compare • {Math.round(revealPercentage)}% revealed
      </div>
    </div>
  );
};