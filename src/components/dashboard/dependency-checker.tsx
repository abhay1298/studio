
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ListTodo, PackageCheck, PackagePlus } from 'lucide-react';
import { DependencyStatusDialog } from './dependency-status-dialog';

export type DependencyScanResult = {
    status: 'success' | 'error';
    installed_packages_count: number;
    requirements_files: string[];
    missing_packages: { name: string; required_spec: string; source_file: string; raw_line: string }[];
    version_conflicts: { name: string; installed_version: string; required_spec: string; source_file: string; raw_line: string }[];
    suggestions: string[];
    errors: string[];
};


export function DependencyChecker() {
  const [scanResult, setScanResult] = useState<DependencyScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);


  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const response = await fetch('/api/scan-dependencies');
      const result: DependencyScanResult = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.errors?.[0] || 'Failed to scan dependencies on the backend.');
      }
      setScanResult(result);
      
    } catch (error: any) {
      setScanError(error.message || 'Could not connect to the dependency scanner service.');
    } finally {
      setIsScanning(false);
    }
  };
  
  const handleInstall = async () => {
      // Logic for installing dependencies will be added here
      setIsDialogOpen(false);
  };

  const renderContent = () => {
    if (isScanning) {
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
                <XCircle className="h-4 w-4" />
                <AlertTitle>Scan Failed</AlertTitle>
                <AlertDescription>{scanError}</AlertDescription>
            </Alert>
        )
    }

    if (!scanResult) {
      return (
        <Alert variant="default" className="border-primary/50">
            <ListTodo className="h-4 w-4" />
            <AlertTitle>Ready to Scan</AlertTitle>
            <AlertDescription>
              Click the "Scan Project Dependencies" button to check for missing Python packages based on the `requirements.txt` files found in your configured project.
            </AlertDescription>
        </Alert>
      );
    }
    
    if (scanResult.errors.length > 0) {
        return (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>An Error Occurred During Scan</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc list-inside">
                        {scanResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )
    }

    const hasMissing = scanResult.missing_packages.length > 0;
    const hasConflicts = scanResult.version_conflicts.length > 0;

    if (!hasMissing && !hasConflicts) {
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
                Your project has {scanResult.missing_packages.length} missing package(s) and {scanResult.version_conflicts.length} version conflict(s).
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
        <Button onClick={handleScan} disabled={isScanning}>
          {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
          Scan Project Dependencies
        </Button>
        {renderContent()}
      </div>
      <DependencyStatusDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          result={scanResult}
          onInstall={handleInstall}
          isInstalling={isInstalling}
      />
    </>
  );
}
