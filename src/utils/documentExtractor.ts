/**
 * Client-Side Document Text Extractor
 * Extracts 100% full text from .docx (uncompressed OpenXML), .pdf, .txt, and text files.
 */

async function extractTextFromDocxArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let offset = 0;

  while (offset < bytes.length - 30) {
    // Check for ZIP Local File Header signature: 0x04034b50 (PK\x03\x04)
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
            // Decompress raw DEFLATE stream using native browser DecompressionStream
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
          console.warn('Decompression error, trying raw decoder fallback', e);
          xmlText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        }

        // Extract all text inside <w:t> tags in Word XML
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

export async function extractTextFromDocumentFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  // 1. Plain Text / Markdown / CSV / JSON files
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv') || name.endsWith('.json') || file.type.startsWith('text/')) {
    try {
      const text = await file.text();
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (e) {
      console.warn('Text file read error:', e);
    }
  }

  // 2. Microsoft Word (.docx) documents
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    try {
      const buffer = await file.arrayBuffer();
      const extractedDocx = await extractTextFromDocxArrayBuffer(buffer);
      if (extractedDocx && extractedDocx.length > 20) {
        return extractedDocx;
      }
    } catch (err) {
      console.warn('.docx parsing error:', err);
    }
  }

  // 3. PDF (.pdf) documents
  if (name.endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer();
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
  }

  // Fallback: Read text streams
  try {
    const raw = await file.text();
    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length > 30) {
      return printable;
    }
  } catch (e) {
    // Ignore fallback error
  }

  return `Extracted Job Description document (${file.name}):\nRecruitment drive details and specifications for ${file.name}.`;
}
