
import { NextRequest, NextResponse } from 'next/server';

// This is the URL of your actual Robot Framework execution backend.
const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

/**
 * This API route proxies a stop request to the execution backend.
 */
export async function POST(req: NextRequest) {
  try {
    console.log(`Forwarding stop request to: ${EXECUTION_BACKEND_URL}/stop`);

    const backendResponse = await fetch(`${EXECUTION_BACKEND_URL}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Execution backend returned an error on stop:', backendResponse.status, errorText);
      return NextResponse.json(
        { message: `Execution backend failed to stop: ${errorText}` },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/stop-tests:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message: 'Failed to connect to the execution backend to send stop signal.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
