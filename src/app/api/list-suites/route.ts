import { NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const response = await fetch(`${EXECUTION_BACKEND_URL}/list-suites`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend server responded with error:', errorData);
      const errorMessage = errorData.error || `Backend server responded with ${response.status}`;
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to list suites:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // This is the key change: ensuring a JSON response even on connection failure
    return NextResponse.json(
        { error: 'Failed to connect to the backend service. Is the Python server running?', details: errorMessage }, 
        { status: 500 }
    );
  }
}

    
    