import type {PDFDocument} from 'pdf-lib';
import type {Whiteboard} from '@/types';
import {readBoard} from './readBoard';
import {parseInteractiveSheetHtml, buildInteractiveSheetHtml} from './interactiveSheetHtml';


const PDF_PAYLOAD_PREFIX = 'C2_WHITEBOARD_JSON_BASE64:';

function safeFileName(name: string, fallback = 'whiteboard'): string {
  return name.trim().replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '-') || fallback;
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportWhiteboard(board: Whiteboard): void {
  const payload = JSON.stringify(board, null, 2);
  const blob = new Blob([payload], {type: 'application/json'});
  downloadBlob(blob, `${safeFileName(board.name)}.json`);
}

export function exportWhiteboardSheet(board: Whiteboard, openInBrowser = true): void {
  const html = buildInteractiveSheetHtml(board);
  const blob = new Blob([html], {type: 'text/html'});
  downloadBlob(blob, `${safeFileName(board.name)}.html`);
  if (openInBrowser) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export async function exportWhiteboardPdf(board: Whiteboard): Promise<void> {
  const boardJson = JSON.stringify(board);
  const encodedBoard = `${PDF_PAYLOAD_PREFIX}${encodeBase64Utf8(boardJson)}`;
  const {buildInteractivePdf} = await import('./pdfFormExport');
  const bytes = await buildInteractivePdf(board, {encodedBoard, boardJson});
  downloadBlob(new Blob([bytes], {type: 'application/pdf'}), `${safeFileName(board.name)}.pdf`);
}

function readEmbeddedBoardJson(pdf: PDFDocument): string | null {
  const subject = pdf.getSubject();
  if (!subject?.startsWith(PDF_PAYLOAD_PREFIX)) return null;
  return decodeBase64Utf8(subject.slice(PDF_PAYLOAD_PREFIX.length));
}

export async function parsePdfWhiteboard(file: File): Promise<Whiteboard> {
  const bytes = await file.arrayBuffer();
  const {PDFDocument} = await import('pdf-lib');
  const pdf = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const boardJson = readEmbeddedBoardJson(pdf);
  if (!boardJson) {
    throw new Error('This PDF does not contain editable C2 whiteboard data. Import a PDF exported from this app.');
  }
  const {applyPdfFields} = await import('./pdfFormImport');
  return applyPdfFields(pdf, parseWhiteboard(boardJson));
}

export function parseWhiteboard(raw: string): Whiteboard {
  return readBoard(JSON.parse(raw));
}

export function parseSheetHtml(raw: string): Whiteboard {
  return readBoard(parseInteractiveSheetHtml(raw));
}
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

