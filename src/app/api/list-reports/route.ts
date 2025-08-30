
import { NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const response = await fetch(`${EXECUTION_BACKEND_URL}/reports`);
    if (!response.ok) {
      throw new Error(`Backend server responded with ${response.status}`);
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to list reports:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to connect to backend service.', details: errorMessage }, { status: 500 });
  }
}
