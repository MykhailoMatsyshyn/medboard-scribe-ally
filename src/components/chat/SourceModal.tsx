import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, TestTube, Stethoscope, ExternalLink, Calendar } from 'lucide-react';

interface Source {
  id: string;
  type: 'test' | 'visit' | 'document';
  title: string;
  date: string;
  snippet?: string;
}

interface SourceModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

const getIcon = (type: Source['type']) => {
  switch (type) {
    case 'test':
      return TestTube;
    case 'visit':
      return Stethoscope;
    default:
      return FileText;
  }
};

const getMockContent = (source: Source) => {
  switch (source.type) {
    case 'test':
      return {
        summary: "Lipid Panel - Comprehensive metabolic assessment",
        details: [
          { label: "Total Cholesterol", value: "165 mg/dL", status: "normal" },
          { label: "LDL Cholesterol", value: "95 mg/dL", status: "normal" },
          { label: "HDL Cholesterol", value: "52 mg/dL", status: "normal" },
          { label: "Triglycerides", value: "118 mg/dL", status: "normal" },
        ]
      };
    case 'visit':
      return {
        summary: "Follow-up visit with Dr. Martinez regarding lipid management and lifestyle modifications.",
        notes: "Patient showing good progress with dietary changes. Continue current medication regimen. Schedule follow-up lipid panel in 3 months."
      };
    default:
      return {
        summary: "Medical record document",
        notes: "Document content preview not available."
      };
  }
};

export const SourceModal: React.FC<SourceModalProps> = ({ 
  source, 
  isOpen, 
  onClose 
}) => {
  if (!source) return null;
  
  const Icon = getIcon(source.type);
  const content = getMockContent(source);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                {source.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                {source.date}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            {content.summary}
          </p>
          
          {'details' in content && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {content.details.map((detail, index) => (
                    <tr 
                      key={index}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {detail.label}
                      </td>
                      <td className="px-3 py-2 text-foreground font-medium text-right">
                        {detail.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {'notes' in content && (
            <div className="p-3 rounded-lg bg-accent/50 text-sm text-muted-foreground">
              {content.notes}
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Open Full Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
