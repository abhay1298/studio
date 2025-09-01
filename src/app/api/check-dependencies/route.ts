
import { NextRequest, NextResponse } from 'next/server';

const EXECUTION_BACKEND_URL = process.env.EXECUTION_BACKEND_URL || 'http://localhost:5001';

// This file is being kept for potential future use or reference,
// but the new dependency scanning logic is handled by:
// - /api/scan-dependencies
// - /api/install-dependencies

type DependencyStatus = {
    library: string;
    status: 'installed' | 'missing';
};

/**
 * @deprecated This API route is deprecated in favor of /api/scan-dependencies which uses the live backend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requirements: string = body.requirements;

    if (!requirements) {
      return NextResponse.json({ message: 'requirements content is missing' }, { status: 400 });
    }

    const requiredLibs = requirements.split('\n').filter(lib => lib.trim() !== '');
    const installedLibs = new Set(['robotframework-requests']); 

    const dependencyStatus: DependencyStatus[] = requiredLibs.map(lib => {
      const libName = lib.split('==')[0].split('>')[0].split('<')[0].trim();
      if (installedLibs.has(libName)) {
        return { library: libName, status: 'installed' };
      } else {
        const isMissing = Math.random() > 0.5;
        return { library: libName, status: isMissing ? 'missing' : 'installed' };
      }
    });

    return NextResponse.json(dependencyStatus);

  } catch (error) {
    console.error('Error in deprecated /api/check-dependencies:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message: 'This endpoint is deprecated. Use /api/scan-dependencies.',
        details: errorMessage,
      },
      { status: 410 }
    );
  }
}
