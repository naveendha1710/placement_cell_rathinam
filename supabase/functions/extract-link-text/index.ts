import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText } from "https://esm.sh/unpdf@0.12.1";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isTextGarbledOrBinary(text: string): boolean {
  if (!text || text.trim().length < 15) return true;
  if (text.includes('Extracted Document Contents') || text.includes('Candidate Resume Document')) return true;
  
  const lower = text.toLowerCase();
  if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<script') || lower.includes('<title>')) return true;

  const validWords = text.match(/[a-zA-Z]{2,}/g) || [];
  const wordLengthSum = validWords.reduce((acc, w) => acc + w.length, 0);
  if ((wordLengthSum / text.length) < 0.50) return true;

  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const link = body.link;
    if (!link || typeof link !== 'string' || !link.trim()) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid document link.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanLink = link.trim();
    const lowerLink = cleanLink.toLowerCase();

    if (lowerLink.includes('onedrive.live.com') || lowerLink.includes('1drv.ms') || lowerLink.includes('sharepoint.com')) {
      return new Response(
        JSON.stringify({ error: 'Microsoft (OneDrive / SharePoint) link support is coming soon. Please provide a Google Drive share link ("Anyone with the link can view") or direct document URL.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let gdriveId: string | null = null;
    const match = cleanLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  cleanLink.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  cleanLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) gdriveId = match[1];

    const candidateUrls: string[] = [];
    if (gdriveId) {
      if (lowerLink.includes('docs.google.com/document/d/')) {
        candidateUrls.push(
          `https://docs.google.com/document/d/${gdriveId}/export?format=txt`,
          `https://docs.google.com/document/d/${gdriveId}/export?format=pdf`
        );
      }
      candidateUrls.push(
        `https://drive.google.com/uc?export=download&confirm=t&id=${gdriveId}`,
        `https://drive.usercontent.google.com/download?id=${gdriveId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${gdriveId}`
      );
    }
    candidateUrls.push(cleanLink);

    let fetchedBuffer: ArrayBuffer | null = null;
    let contentType = '';
    let fetchErrorMsg = '';

    for (const fetchUrl of candidateUrls) {
      try {
        const res = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          redirect: 'follow',
        });

        if (res.ok) {
          contentType = (res.headers.get('content-type') || '').toLowerCase();
          const buffer = await res.arrayBuffer();

          if (buffer.byteLength > 100) {
            const sample = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 1000)).toLowerCase();
            if (contentType.includes('text/html') || sample.includes('<!doctype') || sample.includes('<html')) {
              if (
                sample.includes('servicelogin') ||
                sample.includes('accounts.google.com') ||
                sample.includes('access denied') ||
                sample.includes('page not found') ||
                sample.includes('unable to open')
              ) {
                fetchErrorMsg = 'File is private or inaccessible. Please set Google Drive sharing permissions to "Anyone with the link can view".';
                continue;
              }
              fetchErrorMsg = 'Link returned an HTML web page instead of document bytes. Verify sharing settings.';
              continue;
            }

            fetchedBuffer = buffer;
            break;
          }
        }
      } catch (err: any) {
        fetchErrorMsg = err.message || 'Fetch failed';
      }
    }

    if (!fetchedBuffer) {
      return new Response(
        JSON.stringify({ error: fetchErrorMsg || 'Unable to fetch file content from link. Make sure link sharing is set to "Anyone with the link can view".' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let extractedText = '';
    try {
      extractedText = await extractTextFromBufferServer(fetchedBuffer, contentType, cleanLink);
    } catch (parseErr: any) {
      return new Response(
        JSON.stringify({ error: parseErr.message || 'Failed to parse document text.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!extractedText || isTextGarbledOrBinary(extractedText)) {
      return new Response(
        JSON.stringify({ error: 'Extracted text is empty or unreadable. Please ensure the document contains readable text.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanText = extractedText.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();

    return new Response(
      JSON.stringify({ text: cleanText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Server error processing document link' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function extractTextFromBufferServer(buffer: ArrayBuffer, contentType: string, url: string): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const isPdf = bytes.length > 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

  // A. Check for DOCX with fflate zip decompression
  if (bytes.length > 30 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
    try {
      const unzipped = unzipSync(bytes);
      const docXmlEntry = unzipped['word/document.xml'];
      if (docXmlEntry) {
        const xmlText = strFromU8(docXmlEntry);
        const matches: string[] = [];
        const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
        let m;
        while ((m = regex.exec(xmlText)) !== null) {
          if (m[1]) {
            const cleanText = m[1]
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'");
            matches.push(cleanText);
          }
        }
        if (matches.length > 0) {
          const docxText = matches.join(' ').replace(/\s+/g, ' ').trim();
          if (!isTextGarbledOrBinary(docxText)) {
            return docxText;
          }
        }
      }
    } catch (e) {
      // Continue to next parser
    }
  }

  // B. PDF extraction with unpdf
  if (isPdf) {
    try {
      const pdfResult = await extractText(new Uint8Array(buffer));
      let pdfText = '';
      if (typeof pdfResult === 'string') {
        pdfText = pdfResult;
      } else if (pdfResult && Array.isArray(pdfResult.text)) {
        pdfText = pdfResult.text.join(' ');
      } else if (pdfResult && typeof pdfResult.text === 'string') {
        pdfText = pdfResult.text;
      }

      pdfText = pdfText.replace(/\s+/g, ' ').trim();
      if (pdfText.length > 20 && !isTextGarbledOrBinary(pdfText)) {
        return pdfText;
      }
    } catch (e: any) {
      console.warn('unpdf parsing exception:', e);
    }

    throw new Error('This PDF appears to be scanned or image-based and has no extractable text layer. Please provide a text-based document or Google Doc link.');
  }

  // C. Fallback UTF-8 text decoding ONLY for explicit plain text content
  const lowerUrl = url.toLowerCase();
  const isPlainTextType = contentType.includes('text/plain') ||
                          contentType.includes('text/markdown') ||
                          contentType.includes('text/csv') ||
                          lowerUrl.endsWith('.txt') ||
                          lowerUrl.endsWith('.md');

  if (isPlainTextType) {
    try {
      const rawText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      const lowerRaw = rawText.toLowerCase();
      if (!lowerRaw.includes('<!doctype') && !lowerRaw.includes('<html') && !lowerRaw.includes('<script')) {
        const printable = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        if (printable.length > 30 && !isTextGarbledOrBinary(printable)) {
          return printable;
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  throw new Error('Unable to parse readable text from document. File content is unreadable or unsupported format.');
}
