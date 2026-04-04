import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const OG_UPLOAD_SECRET = 'og-map-capture';

export async function POST(request: NextRequest) {
  try {
    const { image, secret } = await request.json();

    if (!secret || secret !== OG_UPLOAD_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    }

    // base64 data URL -> buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // public/og-map.jpg olarak kaydet
    const publicDir = join(process.cwd(), 'public');
    await mkdir(publicDir, { recursive: true });
    const filePath = join(publicDir, 'og-map.jpg');
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true, path: '/og-map.jpg', size: buffer.length });
  } catch (error) {
    console.error('OG upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
