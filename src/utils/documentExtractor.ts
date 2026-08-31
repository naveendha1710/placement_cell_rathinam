/**
 * Client-Side & Server-Side Document Link Text Extractor
 * Uses Supabase Edge Function 'extract-link-text' for server-to-server Google Drive fetching.
 */

import { supabase } from '../lib/supabase';

export interface RemoteFileFetchResult {
  buffer: ArrayBuffer;
  fileName: string;
  mimeType?: string;
}

export function extractGoogleDriveId(url: string): string | null {
  try {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Primary document link text extraction method.
 * Routes request through the Supabase Edge Function 'extract-link-text'
 * to avoid browser CORS restrictions and third-party proxies.
 */
export async function extractFromUrl(link: string): Promise<string> {
  const cleanLink = (link || '').trim();
  if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
    throw new Error('Invalid URL format. Please provide a valid http:// or https:// link.');
  }

  const lowerLink = cleanLink.toLowerCase();
  if (lowerLink.includes('onedrive.live.com') || lowerLink.includes('1drv.ms') || lowerLink.includes('sharepoint.com')) {
    throw new Error('Microsoft (OneDrive / SharePoint) link support is coming soon. Please provide a Google Drive share link ("Anyone with the link can view") or direct document URL.');
  }

  try {
    // 1. Invoke Supabase Edge Function for server-to-server link fetching
    const { data, error } = await supabase.functions.invoke('extract-link-text', {
      body: { link: cleanLink },
    });

    if (error) {
      console.warn('Supabase Edge Function extract-link-text error, attempting direct fallback:', error);
    } else if (data) {
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.text && typeof data.text === 'string' && data.text.trim().length > 0) {
        return data.text.trim();
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Anyone with the link') || err.message.includes('Microsoft') || err.message.includes('Invalid URL'))) {
      throw err;
    }
    console.warn('Edge Function extraction error:', err);
  }

  // 2. Direct fetch fallback (for direct file URLs or CORS-enabled servers, zero 3rd-party proxies)
  const { buffer, fileName } = await getFileBytes(cleanLink);
  const text = await extractTextFromBuffer(buffer, fileName);
  if (!text || text.trim().length === 0) {
    throw new Error('Could not extract text from document. Please verify document contains readable text.');
  }
  return text;
}

export async function getFileBytes(link: string): Promise<RemoteFileFetchResult> {
  const cleanLink = link.trim();
  const gdriveId = extractGoogleDriveId(cleanLink);

  const candidateUrls: string[] = [];
  if (gdriveId) {
    if (cleanLink.toLowerCase().includes('docs.google.com/document/d/')) {
      candidateUrls.push(`https://docs.google.com/document/d/${gdriveId}/export?format=pdf`);
    }
    candidateUrls.push(
      `https://drive.google.com/uc?export=download&confirm=t&id=${gdriveId}`,
      `https://drive.google.com/uc?export=download&id=${gdriveId}`
    );
  }
  candidateUrls.push(cleanLink);

  let lastErr: Error = new Error('Failed to fetch file from link');

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) continue;

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const buffer = await response.arrayBuffer();

      if (buffer.byteLength > 100) {
        const sample = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 1000)).toLowerCase();
        if (contentType.includes('text/html') || sample.includes('<!doctype') || sample.includes('<html')) {
          if (sample.includes('servicelogin') || sample.includes('access denied') || sample.includes('page not found')) {
            throw new Error('File is private or inaccessible. Please set Google Drive sharing permissions to "Anyone with the link can view".');
          }
          continue;
        }
        return { buffer, fileName: gdriveId ? `gdrive_${gdriveId}.pdf` : 'document.pdf', mimeType: contentType };
      }
    } catch (e: any) {
      lastErr = e;
      if (e.message && e.message.includes('Anyone with the link')) throw e;
    }
  }

  throw new Error(`Failed to fetch file directly: ${lastErr.message || 'CORS restriction'}`);
}

async function extractTextFromDocxArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let offset = 0;

  while (offset < bytes.length - 30) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder('utf-8', { fatal: false }).decode(fileNameBytes);
      const dataStart = offset + 30 + fileNameLen + extraLen;

      if (fileName === 'word/document.xml') {
        const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
        let xmlText = '';

        try {
          if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const response = new Response(ds.readable);
            xmlText = await response.text();
          } else {
            xmlText = new TextDecoder('utf-8', { fatal: false }).decode(compressedData);
          }
        } catch (e) {
          xmlText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        }

        const matches: string[] = [];
        const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
        let match;

        while ((match = regex.exec(xmlText)) !== null) {
          if (match[1]) {
            const cleanText = match[1]
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'");
            matches.push(cleanText);
          }
        }

        if (matches.length > 0) {
          return matches.join(' ').replace(/\s+/g, ' ').trim();
        }
      }

      offset = dataStart + Math.max(1, compressedSize);
    } else {
      offset++;
    }
  }

  return '';
}

function extractTextFromPdfArrayBuffer(buffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('latin1');
    const textContent = decoder.decode(buffer);

    const pdfTextMatches: string[] = [];
    const pdfRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|TJ|'|")/g;
    let match;

    while ((match = pdfRegex.exec(textContent)) !== null) {
      if (match[1]) {
        const clean = match[1].replace(/\\([()\\])/g, '$1').trim();
        if (clean.length > 1) {
          pdfTextMatches.push(clean);
        }
      }
    }

    if (pdfTextMatches.length > 0) {
      const fullPdfText = pdfTextMatches.join(' ').replace(/\s+/g, ' ').trim();
      if (fullPdfText.length > 20) {
        return fullPdfText;
      }
    }
  } catch (err) {
    console.warn('.pdf parsing error:', err);
  }
  return '';
}

export function isBinaryNoise(text: string): boolean {
  if (!text || text.trim().length < 10) return true;
  const validWords = text.match(/[a-zA-Z]{2,}/g) || [];
  const wordLengthSum = validWords.reduce((acc, w) => acc + w.length, 0);
  // If readable alphabetic words make up less than 40% of the string, it is binary noise
  return (wordLengthSum / text.length) < 0.40;
}

export async function extractTextFromBuffer(buffer: ArrayBuffer, fileName = 'document.pdf'): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const isPdf = bytes.length > 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

  const docxText = await extractTextFromDocxArrayBuffer(buffer);
  if (docxText && docxText.length > 20 && !isBinaryNoise(docxText)) {
    return docxText.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  if (isPdf) {
    const pdfText = extractTextFromPdfArrayBuffer(buffer);
    if (pdfText && pdfText.length > 20 && !isBinaryNoise(pdfText)) {
      return pdfText.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }
    throw new Error('This PDF appears to be scanned or image-based and has no extractable text layer. Please provide a text-based document or Google Doc link.');
  }

  try {
    const rawText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const lowerRaw = rawText.toLowerCase();

    if (lowerRaw.includes('<!doctype') || lowerRaw.includes('<html') || lowerRaw.includes('<script') || lowerRaw.includes('<title>')) {
      throw new Error('Link returned an HTML web page instead of document text. Verify document link.');
    }

    const printable = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length > 30 && !isBinaryNoise(printable)) {
      return printable.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }
  } catch (e: any) {
    if (e.message && e.message.includes('HTML web page')) throw e;
  }

  throw new Error('Unable to parse readable text from document. File content is unreadable or corrupted.');
}

export async function extractTextFromDocumentFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return extractTextFromBuffer(buffer, file.name);
}
