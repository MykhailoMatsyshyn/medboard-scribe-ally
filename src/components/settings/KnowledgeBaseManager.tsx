import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { extractText } from "@/lib/extractText";
import { Upload, Trash2, FileText, Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RagFile {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: "pending" | "ready" | "error";
  error_message: string | null;
  chunk_count: number;
  created_at: string;
  storage_path: string;
}

const ACCEPTED =
  ".txt,.md,.csv,.json,.pdf,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const KnowledgeBaseManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<RagFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("rag_files")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load files", description: error.message, variant: "destructive" });
    } else {
      setFiles((data ?? []) as RagFile[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !user) return;
    const filesToUpload = Array.from(fileList);
    e.target.value = ""; // reset

    setUploading(true);
    for (const file of filesToUpload) {
      try {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: `${file.name} too large`, description: "Max 20MB per file.", variant: "destructive" });
          continue;
        }

        // Extract text first (fail fast for unsupported types)
        toast({ title: "Reading file…", description: file.name });
        const text = await extractText(file);
        if (!text.trim()) {
          throw new Error("No text could be extracted from this file");
        }

        // Upload to storage
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("rag-files")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) throw upErr;

        // Insert row
        const { data: row, error: insErr } = await supabase
          .from("rag_files")
          .insert({
            user_id: user.id,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            storage_path: path,
            status: "pending",
          })
          .select()
          .single();
        if (insErr) throw insErr;

        await loadFiles();

        // Ingest (embed) in background
        toast({ title: "Indexing for search…", description: file.name });
        const { error: fnErr } = await supabase.functions.invoke("ingest-rag-file", {
          body: { file_id: row.id, text },
        });
        if (fnErr) throw fnErr;

        toast({ title: "Added to knowledge base", description: file.name });
      } catch (err: any) {
        console.error(err);
        toast({
          title: `Failed: ${file.name}`,
          description: err?.message || "Unknown error",
          variant: "destructive",
        });
      }
      await loadFiles();
    }
    setUploading(false);
  };

  const handleDelete = async (file: RagFile) => {
    if (!confirm(`Delete "${file.file_name}" from your knowledge base?`)) return;
    try {
      // Delete storage object (chunks cascade via FK)
      await supabase.storage.from("rag-files").remove([file.storage_path]);
      const { error } = await supabase.from("rag_files").delete().eq("id", file.id);
      if (error) throw error;
      toast({ title: "Deleted", description: file.file_name });
      loadFiles();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5 text-primary" />
          Knowledge Base
        </CardTitle>
        <CardDescription>
          Upload documents (PDF, Word, text). The AI will use them to answer your questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload files"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: .pdf, .docx, .txt, .md, .csv, .json — max 20MB each.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
            No files yet. Upload documents to start asking questions about them.
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
              >
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.file_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{formatSize(f.size_bytes)}</span>
                    {f.status === "ready" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {f.chunk_count} chunks
                      </span>
                    )}
                    {f.status === "pending" && (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing
                      </span>
                    )}
                    {f.status === "error" && (
                      <span className="flex items-center gap-1 text-destructive" title={f.error_message ?? ""}>
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(f)} title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
