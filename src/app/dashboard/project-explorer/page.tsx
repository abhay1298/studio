
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ProjectExplorer as ProjectExplorerComponent, TestSuite } from '@/components/dashboard/project-explorer';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServerCrash, FileCode, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProjectExplorerPage() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSuites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const response = await fetch('/api/list-suites');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch suites from the backend.');
        }
        const suites = await response.json();
        setTestSuites(suites);
        if (suites.length === 0) {
           toast({
                variant: 'default',
                title: 'No Test Suites Found',
                description: "The backend didn't find any .robot files with test cases in the configured directory.",
            });
        }
    } catch (e: any) {
        console.error("Failed to fetch test suites:", e);
        setError(e.message || 'An unknown error occurred.');
        toast({
            variant: 'destructive',
            title: 'Error Loading Project',
            description: e.message || 'Could not connect to the backend to get the project structure.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchSuites();
  }, [fetchSuites]);

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
            {error ? (
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Could Not Load Project</AlertTitle>
                    <AlertDescription>
                        <p>{error}</p>
                        <p className="mt-2 text-xs">Please ensure the Python backend server is running and the `TESTS_DIRECTORY` in `server.py` is configured correctly.</p>
                    </AlertDescription>
                    <Button variant="secondary" size="sm" onClick={fetchSuites} className="mt-4">
                      <RefreshCw className="mr-2 h-4 w-4"/>
                       Try Again
                    </Button>
                </Alert>
            ) : (
                <ProjectExplorerComponent suites={testSuites} isLoading={isLoading} />
            )}
          </CardContent>
        </Card>
    </div>
  );
}
