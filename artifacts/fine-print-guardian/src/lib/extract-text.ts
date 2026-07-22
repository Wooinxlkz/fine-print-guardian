/**
 * Client-side text extraction for any file type.
 * PDF  → pdfjs-dist (page-by-page text content)
 * DOCX → mammoth (extract raw text)
 * *    → FileReader as UTF-8 text
 */

// pdfjs worker must be told where to find its own worker bundle.
// We use the bundled legacy worker to avoid a separate fetch.
import * as pdfjs from "pdfjs-dist";
// @ts-ignore – mammoth ships CJS, types may be loose
import mammoth from "mammoth";

// Point pdfjs at the bundled worker (Vite will inline it via ?url)
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ExtractionResult = {
  text: string;
  fileName: string;
  pageCount?: number;
};

export async function extractText(file: File): Promise<ExtractionResult> {
  const name = file.name;
  const lower = name.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return extractPdf(file);
  }

  if (lower.endsWith(".docx")) {
    return extractDocx(file);
  }

  // Fallback: read as plain text (works for .txt, .md, .rtf, .csv, etc.)
  return extractPlainText(file);
}

async function extractPdf(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return {
    text: pages.join("\n\n"),
    fileName: file.name,
    pageCount: pdf.numPages,
  };
}

async function extractDocx(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return { text: result.value, fileName: file.name };
}

async function extractPlainText(file: File): Promise<ExtractionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ text: e.target?.result as string, fileName: file.name });
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
