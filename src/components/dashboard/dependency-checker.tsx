
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ListTodo, PackageCheck, PackagePlus, ServerCrash } from 'lucide-react';
import { DependencyStatusDialog } from './dependency-status-dialog';
import { useExecutionContext } from '@/contexts/execution-context';
import { Skeleton } from '../ui/skeleton';

export type DependencyScanResult = {
    status: 'success' | 'error';
    installed_packages_count: number;
    requirements_files: string[];
    missing_packages: { name: string; required_spec: string; source_file: string; raw_line: string }[];
    version_conflicts: { name: string; installed_version: string; required_spec: string; source_file: string; raw_line: string }[];
    suggestions: string[];
    errors: string[];
};

type DependencyCheckerProps = {
  projectIsLoaded: boolean;
};

export function DependencyChecker({ projectIsLoaded }: DependencyCheckerProps) {
  const { 
    dependencyScanResult,
    isScanningDependencies,
    scanError,
    scanDependencies,
    installDependencies,
    isInstallingDependencies,
  } = useExecutionContext();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleInstall = () => {
    if (dependencyScanResult?.missing_packages) {
      installDependencies(dependencyScanResult.missing_packages);
    }
  };

  const hasMissing = (dependencyScanResult?.missing_packages?.length || 0) > 0;
  const hasConflicts = (dependencyScanResult?.version_conflicts?.length || 0) > 0;
  const hasIssues = hasMissing || hasConflicts;
  const foundReqs = (dependencyScanResult?.requirements_files?.length || 0) > 0;

  const renderContent = () => {
    if (isScanningDependencies) {
        return (
            <div className="flex items-center gap-4 text-muted-foreground p-4 justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>Scanning repository for dependencies...</p>
            </div>
        )
    }

    if (scanError) {
        return (
             <Alert variant="destructive">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>Scan Failed</AlertTitle>
                <AlertDescription>{scanError}</AlertDescription>
            </Alert>
        )
    }

    if (!dependencyScanResult) {
      return (
        <Alert variant="default" className="border-primary/50">
            <ListTodo className="h-4 w-4" />
            <AlertTitle>Ready to Scan</AlertTitle>
            <AlertDescription>
              Click the "Scan Project Dependencies" button to check for missing Python packages based on the `requirements.txt` files found in your project.
            </AlertDescription>
        </Alert>
      );
    }
    
    if (dependencyScanResult.errors.length > 0) {
        return (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>An Error Occurred During Scan</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc list-inside">
                        {dependencyScanResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )
    }

    if (!foundReqs) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Requirements Files Found</AlertTitle>
                <AlertDescription>
                    The scan completed but could not find any `requirements.txt` files in your project.
                </AlertDescription>
            </Alert>
        )
    }
    
    if (!hasIssues) {
         return (
             <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
                <PackageCheck className="h-4 w-4 !text-green-500" />
                <AlertTitle>All Dependencies Satisfied</AlertTitle>
                <AlertDescription>Your environment appears to be ready for execution. All required packages are installed.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Dependency Issues Found</AlertTitle>
            <AlertDescription>
                Your project has {dependencyScanResult.missing_packages.length} missing package(s) and {dependencyScanResult.version_conflicts.length} version conflict(s).
            </AlertDescription>
            <Button size="sm" className="mt-4 w-full" onClick={() => setIsDialogOpen(true)}>
                <PackagePlus className="mr-2 h-4 w-4" />
                View & Install Missing
            </Button>
        </Alert>
    );
  };

  return (
    <>
      <div className="grid gap-4">
        <Button onClick={scanDependencies} disabled={isScanningDependencies || !projectIsLoaded}>
          {isScanningDependencies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
          Scan Project Dependencies
        </Button>

        {renderContent()}
      </div>
      <DependencyStatusDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          result={dependencyScanResult}
          onInstall={handleInstall}
          isInstalling={isInstallingDependencies}
      />
    </>
  );
}

