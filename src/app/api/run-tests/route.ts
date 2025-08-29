import {NextRequest, NextResponse} from 'next/server';

// This is the URL of your actual Robot Framework execution backend.
// You would need to build this service separately. It could be a Flask,
// Express, or any other type of server that can execute shell commands.
const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001/run';


/**
 * This API route acts as a proxy between the Next.js frontend and the
 * actual Robot Framework execution backend.
 *
 * It receives the request from the UI, forwards it to the execution backend,
 * and then streams the results back to the UI.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // In a real application, you would also handle file uploads (e.g., project.zip)
    // and forward them to the backend. This example focuses on the parameters.

    console.log(`Forwarding execution request to: ${EXECUTION_BACKEND_URL}`);
    console.log('Request body:', body);

    // Make a request to your actual execution backend
    const backendResponse = await fetch(EXECUTION_BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // Pass the configuration received from the frontend
            runType: body.runType,
            config: body.config,
            // You would also include file data here
        }),
    });

    // Check if the backend responded successfully
    if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('Execution backend returned an error:', backendResponse.status, errorText);
        return NextResponse.json(
            {
                status: 'error',
                message: `Execution backend failed: ${errorText}`,
            },
            { status: backendResponse.status }
        );
    }

    // Get the JSON response from the backend (which should include status and logs)
    const result = await backendResponse.json();

    // Return the response from the backend directly to the frontend
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/run-tests:', error);
    // This will catch network errors if your execution backend is down
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to the execution backend.',
        details: errorMessage,
      },
      {status: 500}
    );
  }
}
