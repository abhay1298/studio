
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repo_url } = body;

    if (!repo_url) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    const backendUrl = `${EXECUTION_BACKEND_URL}/clone-repo`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repo_url }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Backend failed to clone repository' }, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/clone-repo:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to connect to backend to clone repository.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
