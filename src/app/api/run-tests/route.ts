import {NextRequest, NextResponse} from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001/run';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log(`Forwarding execution request to: ${EXECUTION_BACKEND_URL}`);
    console.log('Request body:', body);

    const backendResponse = await fetch(EXECUTION_BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            runType: body.runType,
            config: body.config,
        }),
    });

    if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('Execution backend returned an error:', backendResponse.status, errorText);
        try {
            const errorJson = JSON.parse(errorText);
             return NextResponse.json(
                {
                    status: 'error',
                    message: `Execution backend failed: ${errorJson.message || errorText}`,
                },
                { status: backendResponse.status }
            );
        } catch(e) {
             return NextResponse.json(
                {
                    status: 'error',
                    message: `Execution backend failed: ${errorText}`,
                },
                { status: backendResponse.status }
            );
        }
    }

    const result = await backendResponse.json();

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/run-tests:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to the execution backend. Is the Python server running?',
        details: errorMessage,
      },
      {status: 500}
    );
  }
}
