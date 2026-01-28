import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    console.log('Processing file:', fileName, 'Size:', file.size);
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer size:', buffer.length);

    let text = '';

    if (fileName.endsWith('.pdf')) {
      // Parse PDF using pdf-parse v1.x (server-compatible)
      console.log('Parsing PDF...');
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        text = data.text || '';
        console.log('Extracted text length:', text.length);
      } catch (pdfError: any) {
        console.error('PDF parsing error:', pdfError?.message);
        throw pdfError;
      }
    } else if (fileName.endsWith('.docx')) {
      // Parse DOCX
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (fileName.endsWith('.txt')) {
      // Plain text
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
        { status: 400 }
      );
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return NextResponse.json(
      { error: `Failed to parse document: ${error?.message || 'Unknown error'}. Please try again or paste the content manually.` },
      { status: 500 }
    );
  }
}
