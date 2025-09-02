
"use client";

import { useEffect } from 'react';
import { ProjectExplorer as ProjectExplorerComponent } from '@/components/dashboard/project-explorer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServerCrash, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExecutionContext } from '@/contexts/execution-context';

export default function ProjectExplorerPage() {
  const { 
    testSuites, 
    isLoadingSuites, 
    suiteLoadError, 
    fetchSuites,
    directoryStatus,
  } = useExecutionContext();

  useEffect(() => {
    if (directoryStatus?.configured) {
      fetchSuites();
    }
  }, [fetchSuites, directoryStatus]);

  return (
    <div className="space-y-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
            Project Explorer
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Test Suites & Cases</CardTitle>
            <CardDescription>
              This is a live view of the test suites found in your configured test directory on the backend server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suiteLoadError ? (
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Could Not Load Project</AlertTitle>
                    <AlertDescription>
                        <p>{suiteLoadError}</p>
                        <p className="mt-2 text-xs">Please ensure the Python backend server is running and a valid test directory is configured on the Project Configuration page.</p>
                    </AlertDescription>
                    <Button variant="secondary" size="sm" onClick={fetchSuites} className="mt-4">
                      <RefreshCw className="mr-2 h-4 w-4"/>
                       Try Again
                    </Button>
                </Alert>
            ) : (
                <ProjectExplorerComponent suites={testSuites} isLoading={isLoadingSuites} />
            )}
          </CardContent>
        </Card>
    </div>
  );
}
