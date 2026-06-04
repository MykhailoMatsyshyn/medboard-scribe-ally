// Client-side text extraction for RAG ingestion
// Supports: txt, md, pdf, docx

import mammoth from "mammoth";

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json")
  ) {
    return await file.text();
  }

  if (name.endsWith(".docx") || type.includes("officedocument.wordprocessingml")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  if (name.endsWith(".pdf") || type === "application/pdf") {
    // Lazy load pdfjs to keep initial bundle smaller
    const pdfjs: any = await import("pdfjs-dist");
    // Use the bundled worker
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = (worker as any).default;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it: any) => it.str).join(" ");
      pages.push(text);
    }
    return pages.join("\n\n");
  }

  if (name.endsWith(".pptx")) {
    throw new Error("PPTX files are not yet supported. Please convert to PDF or DOCX.");
  }

  // Fallback: try reading as text
  try {
    return await file.text();
  } catch {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
}
