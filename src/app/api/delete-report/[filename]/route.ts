
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;

  try {
    const backendUrl = `${EXECUTION_BACKEND_URL}/delete-report/${filename}`;
    const response = await fetch(backendUrl, { method: 'DELETE' });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || 'Backend failed to delete file' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Failed to delete report ${filename}:`, error);
    return NextResponse.json({ error: 'Failed to connect to backend to delete report' }, { status: 500 });
  }
}
