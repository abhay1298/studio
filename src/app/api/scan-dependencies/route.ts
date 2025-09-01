
import { NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const response = await fetch(`${EXECUTION_BACKEND_URL}/scan-dependencies`);
    
    if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ error: errorData.error || 'Backend failed to scan dependencies' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to scan dependencies:', error);
    return NextResponse.json({ error: 'Failed to connect to backend to scan dependencies' }, { status: 500 });
  }
}
