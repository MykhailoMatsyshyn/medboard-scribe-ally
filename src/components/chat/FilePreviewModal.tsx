import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, FlaskConical, Brain } from 'lucide-react';
import { RagFile } from '@/data/ragDemo';
import { cn } from '@/lib/utils';

const iconFor = {
  lab_report: FlaskConical,
  doctor_summary: FileText,
  mri_metadata: Brain,
  pdf: FileText,
} as const;

interface Props {
  file: RagFile | null;
  isOpen: boolean;
  onClose: () => void;
}

const flagColor: Record<string, string> = {
  low: 'text-warning',
  high: 'text-destructive',
  normal: 'text-success',
};

export const FilePreviewModal: React.FC<Props> = ({ file, isOpen, onClose }) => {
  if (!file) return null;
  const Icon = iconFor[file.fileType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">
                {file.fileName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {file.date}
                {file.author && ` · ${file.author}`}
                {file.pages && ` · ${file.pages} page${file.pages > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Rendered "document" preview */}
        <div className="flex-1 overflow-y-auto mt-2 rounded-lg border border-border bg-background p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">{file.preview.title}</h3>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {file.preview.body}
          </p>

          {file.preview.table && (
            <div className="mt-5 rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {file.preview.table.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                      <td
                        className={cn(
                          'px-3 py-2 font-medium text-right tabular-nums',
                          row.flag ? flagColor[row.flag] : 'text-foreground',
                        )}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 gap-2">
          <p className="text-[11px] text-muted-foreground">
            Demo preview — original file rendered from the RAG index.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <Button size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Open full
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
