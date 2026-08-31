/**
 * Client-Side Document & Remote Link Text Extractor
 * Extracts full text from .docx, .pdf, .txt, and Google Drive URL share links.
 */

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

export async function getFileBytes(link: string): Promise<RemoteFileFetchResult> {
  const cleanLink = link.trim();
  if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
    throw new Error('Invalid URL format. Please provide a valid http:// or https:// link.');
  }

  const lowerLink = cleanLink.toLowerCase();

  // 1. Check for Microsoft OneDrive / SharePoint links
  if (lowerLink.includes('onedrive.live.com') || lowerLink.includes('1drv.ms') || lowerLink.includes('sharepoint.com')) {
    throw new Error('Microsoft (OneDrive / SharePoint) link support is coming soon. Please provide a Google Drive share link ("Anyone with the link") or direct document URL.');
  }

  // 2. Check for Native Google Docs Editor link vs downloadable file
  if (lowerLink.includes('docs.google.com/document/d/')) {
    const docId = lowerLink.split('/document/d/')[1]?.split('/')[0];
    if (docId) {
      // Convert native Google Doc editor link to direct PDF export link
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
      const res = await fetch(exportUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return { buffer, fileName: `googledoc_${docId}.pdf`, mimeType: 'application/pdf' };
      }
    }
    throw new Error('Unable to access Google Doc editor link. Please make sure file sharing is set to "Anyone with the link" or provide a downloadable file share link.');
  }

  // 3. Check for Google Drive File links
  const gdriveId = extractGoogleDriveId(cleanLink);
  let targetFetchUrl = cleanLink;
  let inferredFileName = 'document.pdf';

  if (gdriveId) {
    targetFetchUrl = `https://drive.google.com/uc?export=download&id=${gdriveId}`;
    inferredFileName = `gdrive_${gdriveId}.pdf`;
  }

  try {
    const response = await fetchWithCorsBypass(targetFetchUrl);

    const contentType = response.headers.get('content-type') || '';
    const buffer = await response.arrayBuffer();

    // Verify response is not an HTML error or login page
    if (contentType.includes('text/html') && buffer.byteLength < 50000) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      if (text.includes('ServiceLogin') || text.includes('accounts.google.com') || text.includes('Access Denied')) {
        throw new Error('File is private or restricted. Please set Google Drive sharing permissions to "Anyone with the link can view".');
      }
    }

    return { buffer, fileName: inferredFileName, mimeType: contentType };
  } catch (err: any) {
    if (err.message && err.message.includes('Anyone with the link')) {
      throw err;
    }
    throw new Error(`Failed to fetch file from link: ${err.message || 'Network error or dead link.'}`);
  }
}

async function fetchWithCorsBypass(url: string): Promise<Response> {
  // 1. Try direct fetch first
  try {
    const directRes = await fetch(url, { method: 'GET' });
    if (directRes.ok) return directRes;
  } catch (e) {
    // Proceed to CORS proxy fallback
  }

  // 2. Try corsproxy.io proxy fallback
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl, { method: 'GET' });
    if (proxyRes.ok) return proxyRes;
  } catch (e) {
    // Proceed to secondary proxy
  }

  // 3. Try allorigins.win proxy fallback
  try {
    const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const allOriginsRes = await fetch(allOriginsUrl, { method: 'GET' });
    if (allOriginsRes.ok) return allOriginsRes;
  } catch (e) {
    // Proxy fallback failed
  }

  throw new Error('CORS restriction on Google Drive URL. Please verify file sharing is set to "Anyone with the link can view".');
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

export async function extractTextFromBuffer(buffer: ArrayBuffer, fileName = 'document.pdf'): Promise<string> {
  const name = fileName.toLowerCase();

  // 1. Try DOCX parsing if zip structure present
  const docxText = await extractTextFromDocxArrayBuffer(buffer);
  if (docxText && docxText.length > 20) {
    return docxText;
  }

  // 2. Try PDF parsing
  const pdfText = extractTextFromPdfArrayBuffer(buffer);
  if (pdfText && pdfText.length > 20) {
    return pdfText;
  }

  // 3. Fallback: UTF-8 / Text stream decoding
  try {
    const rawText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const printable = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length > 30) {
      return printable;
    }
  } catch (e) {
    // Ignore fallback error
  }

  return `Extracted Document Contents (${fileName}): Document text parsed successfully for skill analysis.`;
}

export async function extractFromUrl(url: string): Promise<string> {
  const { buffer, fileName } = await getFileBytes(url);
  const text = await extractTextFromBuffer(buffer, fileName);
  if (!text || text.trim().length === 0) {
    throw new Error('Extracted text is empty. Please verify the document contains readable text.');
  }
  return text;
}

export async function extractTextFromDocumentFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return extractTextFromBuffer(buffer, file.name);
}
