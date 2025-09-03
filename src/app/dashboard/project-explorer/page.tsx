
"use client";

import { useEffect, useState } from 'react';
import { ProjectExplorer as ProjectExplorerComponent } from '@/components/dashboard/project-explorer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServerCrash, RefreshCw, FolderSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExecutionContext } from '@/contexts/execution-context';
import Link from 'next/link';

export default function ProjectExplorerPage() {
  const { 
    testSuites, 
    isLoadingSuites, 
    suiteLoadError, 
    fetchSuites,
    isTestDirectoryConfigured
  } = useExecutionContext();

  useEffect(() => {
    // We only fetch if a directory is configured.
    if (isTestDirectoryConfigured) {
      fetchSuites();
    }
  }, [fetchSuites, isTestDirectoryConfigured]);

  const renderContent = () => {
    if (!isTestDirectoryConfigured && !isLoadingSuites) {
      return (
        <Alert>
            <FolderSearch className="h-4 w-4" />
            <AlertTitle>No Project Configured</AlertTitle>
            <AlertDescription>
                Please upload or clone a Robot Framework project on the Project Management page to see your test suites here.
            </AlertDescription>
             <Link href="/dashboard/project-management" passHref>
                <Button variant="default" size="sm" className="mt-4">
                  Go to Project Management
                </Button>
            </Link>
        </Alert>
      )
    }

    if (suiteLoadError) {
       return (
            <Alert variant="destructive">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>Could Not Load Project</AlertTitle>
                <AlertDescription>
                    <p>{suiteLoadError}</p>
                    <p className="mt-2 text-xs">This can happen if the backend server is not running, or if the uploaded project is invalid.</p>
                </AlertDescription>
                <Button variant="secondary" size="sm" onClick={fetchSuites} className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4"/>
                   Try Again
                </Button>
            </Alert>
        )
    }

    return <ProjectExplorerComponent suites={testSuites} isLoading={isLoadingSuites} />
  }

  return (
    <div className="space-y-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
            Project Explorer
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Test Suites & Cases</CardTitle>
            <CardDescription>
              A live view of the test suites from your currently active project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
    </div>
  );
}
