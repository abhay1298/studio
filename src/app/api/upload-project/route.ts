
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('project') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append('project', file, file.name);

    const backendUrl = `${EXECUTION_BACKEND_URL}/upload-project`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: backendFormData,
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

    