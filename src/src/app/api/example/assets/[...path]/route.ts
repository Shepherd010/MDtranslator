import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

// 根据文件扩展名返回对应的 Content-Type
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'pdf': 'application/pdf',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 构建文件路径
    const filePath = params.path.join('/');
    const fullPath = join(process.cwd(), '..', 'example', 'assets', filePath);
    
    // 安全检查：确保路径在 assets 目录内
    const assetsDir = join(process.cwd(), '..', 'example', 'assets');
    if (!fullPath.startsWith(assetsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    // 检查文件是否存在
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // 读取文件
    const fileBuffer = await readFile(fullPath);
    const contentType = getContentType(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve asset:', error);
    return NextResponse.json(
      { error: 'Failed to load asset' },
      { status: 500 }
    );
  }
}
