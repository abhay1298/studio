
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  const { searchParams } = new URL(request.url);
  const download = searchParams.get('download');

  try {
    const backendUrl = `${EXECUTION_BACKEND_URL}/reports/${filename}`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      return new NextResponse('Report not found on backend server', { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    
    if (download === 'true') {
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return new NextResponse(blob, { status: 200, statusText: 'OK', headers });

  } catch (error) {
    console.error(`Failed to get report ${filename}:`, error);
    return new NextResponse('Failed to connect to backend to retrieve report', { status: 500 });
  }
}
