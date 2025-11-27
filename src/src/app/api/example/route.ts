import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 读取 example/README.md 文件
    const examplePath = join(process.cwd(), '..', 'example', 'README.md');
    let content = await readFile(examplePath, 'utf-8');
    
    // 将相对路径 ./assets/xxx 转换为 API 路径 /api/example/assets/xxx
    content = content.replace(/\.\/(assets\/[^)\s"']+)/g, '/api/example/$1');
    // 同时处理 assets/xxx 格式（不带 ./）
    content = content.replace(/(?<!\/)assets\/([^)\s"']+)/g, '/api/example/assets/$1');
    
    return NextResponse.json({
      title: 'Embodied-Reasoner Example',
      content
    });
  } catch (error) {
    console.error('Failed to load example:', error);
    return NextResponse.json(
      { error: 'Failed to load example file' },
      { status: 500 }
    );
  }
}
