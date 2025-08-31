
import { NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

/**
 * This API route proxies status requests from the frontend to the execution backend.
 * It allows the UI to poll for live updates during a test run.
 */
export async function GET() {
  try {
    const backendUrl = `${EXECUTION_BACKEND_URL}/status`;
    const response = await fetch(backendUrl, {
      cache: 'no-store', // Ensure we always get the latest status
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Execution backend returned an error on status check:', response.status, errorText);
      // Try to parse as JSON, but fallback to text
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({ error: errorJson.error || 'Backend status check failed' }, { status: response.status });
      } catch (e) {
        return NextResponse.json({ error: errorText }, { status: response.status });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to get status from backend:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to connect to backend to get status', details: errorMessage }, { status: 500 });
  }
}
