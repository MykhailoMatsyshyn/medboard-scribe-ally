import React from 'react';
import { FileText, FlaskConical, Brain, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RagFile } from '@/data/ragDemo';

const iconFor = {
  lab_report: FlaskConical,
  doctor_summary: FileText,
  mri_metadata: Brain,
  pdf: FileText,
} as const;

const labelFor = {
  lab_report: 'Lab report',
  doctor_summary: 'Visit summary',
  mri_metadata: 'MRI metadata',
  pdf: 'Document',
} as const;

interface Props {
  file: RagFile;
  onPreview: (file: RagFile) => void;
}

export const SourceFileCard: React.FC<Props> = ({ file, onPreview }) => {
  const Icon = iconFor[file.fileType];
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
      <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{file.fileName}</div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          <span className="px-1.5 py-0.5 rounded bg-muted">{labelFor[file.fileType]}</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {file.date}
          </span>
          {file.pages && <span>· {file.pages}p</span>}
          {file.sizeKb && <span>· {file.sizeKb} KB</span>}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 flex-shrink-0"
        onClick={() => onPreview(file)}
      >
        <Eye className="w-3.5 h-3.5" />
        Preview
      </Button>
    </div>
  );
};
