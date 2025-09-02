
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function POST(req: NextRequest) {
  try {
    // The request from the browser will be a FormData object
    const formData = await req.formData();
    
    // We forward this FormData directly to the Python backend.
    const backendUrl = `${EXECUTION_BACKEND_URL}/upload-project`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      // NOTE: Do not set 'Content-Type' header here.
      // The browser will automatically set it to 'multipart/form-data'
      // with the correct boundary.
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || 'Backend failed to process file' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/upload-project:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to connect to backend to upload project.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
