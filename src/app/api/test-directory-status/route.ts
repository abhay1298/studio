
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function GET(req: NextRequest) {
  try {
    const backendUrl = `${EXECUTION_BACKEND_URL}/test-directory-status`;

    const backendResponse = await fetch(backendUrl, { cache: 'no-store' });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json({ message: data.message || 'Backend failed to get status' }, { status: backendResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/test-directory-status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message: 'Failed to connect to the execution backend to get status.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
