
import { NextRequest, NextResponse } from 'next/server';

type DependencyStatus = {
    library: string;
    status: 'installed' | 'missing';
};

/**
 * This API route simulates checking for installed Python packages.
 * In a real application, this would likely execute a command like `pip freeze`
 * on the execution environment and compare it against the requirements.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requirements: string = body.requirements;

    if (!requirements) {
      return NextResponse.json({ message: 'requirements content is missing' }, { status: 400 });
    }

    const requiredLibs = requirements.split('\n').filter(lib => lib.trim() !== '');

    // For demonstration, we'll simulate a check.
    // In a real scenario, you'd get the list of installed packages from your backend.
    const installedLibs = new Set(['robotframework-requests']); // Let's pretend this one is always installed

    const dependencyStatus: DependencyStatus[] = requiredLibs.map(lib => {
      // Clean up version specifiers for the check
      const libName = lib.split('==')[0].split('>')[0].split('<')[0].trim();
      if (installedLibs.has(libName)) {
        return { library: libName, status: 'installed' };
      } else {
        // Let's add some randomness to the simulation
        const isMissing = Math.random() > 0.5;
        return { library: libName, status: isMissing ? 'missing' : 'installed' };
      }
    });

    return NextResponse.json(dependencyStatus);

  } catch (error) {
    console.error('Error in /api/check-dependencies:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message: 'Failed to check dependencies.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
