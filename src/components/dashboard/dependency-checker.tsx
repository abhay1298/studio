"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ListChecks, Ban } from 'lucide-react';
import { DependencyStatusDialog } from './dependency-status-dialog';
import { useToast } from '@/hooks/use-toast';
import { useExecutionContext } from '@/contexts/execution-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export type MissingPackage = {
    raw_line: string;
    source_file: string;
};

export type DependencyScanResult = {
    status: 'success' | 'error';
    installed_packages_count: number;
    requirements_files: string[];
    missing_packages: MissingPackage[];
    suggestions: string[];
    errors: string[];
}

export function DependencyChecker() {
  const [scanResult, setScanResult] = useState<DependencyScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { toast } = useToast();
  const { isTestDirectoryConfigured, addLog, logs } = useExecutionContext();

  const handleScanDependencies = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await fetch('/api/scan-dependencies');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to scan dependencies on the server.');
      }
      setScanResult(data);
      setIsDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
       toast({
          variant: "destructive",
          title: "Scan Failed",
          description: err.message,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleInstallDependencies = async () => {
    if (!scanResult || scanResult.missing_packages.length === 0) return;

    setIsInstalling(true);
    setError(null);
    setIsDialogOpen(false); // Close the details dialog
    
    // We expect the logs to provide feedback on this.
    toast({
        title: "Installation Started",
        description: `Installing ${scanResult.missing_packages.length} package(s). Check Execution Logs for progress.`
    });

    try {
        const response = await fetch('/api/install-dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missing_packages: scanResult.missing_packages }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to start installation.');
        }

        addLog('--- Dependency Installation Started ---');
        // Let polling in ExecutionPanel handle the logs
        
    } catch (err: any) {
        setError(err.message || "An unknown error occurred during installation.");
         toast({
            variant: "destructive",
            title: "Installation Failed",
            description: err.message,
        });
    } finally {
        setIsInstalling(false);
        // Rescan after attempting install
        handleScanDependencies();
    }
  }


  const renderStatus = () => {
     if (!isTestDirectoryConfigured) {
        return (
            <Alert variant="default" className="border-amber-500/50">
                <Ban className="h-4 w-4" />
                <AlertTitle>Project Not Loaded</AlertTitle>
                <AlertDescription>
                    Please upload or clone a project first before checking for dependencies.
                </AlertDescription>
            </Alert>
        );
    }

    if (error) {
       return (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Scan Error</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        );
    }

    if (isScanning) {
         return (
            <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Scanning...</AlertTitle>
                <AlertDescription>
                    Checking the backend environment for required packages...
                </AlertDescription>
            </Alert>
        );
    }

    if (!scanResult) {
       return (
            <Alert>
                <ListChecks className="h-4 w-4" />
                <AlertTitle>Ready to Scan</AlertTitle>
                <AlertDescription>
                    Click the "Scan Project Dependencies" button to check for missing Python packages based on the `requirements.txt` files found in your project.
                </AlertDescription>
            </Alert>
        );
    }

    const { missing_packages, suggestions } = scanResult;

    if (missing_packages.length > 0) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{missing_packages.length} Missing Dependencies</AlertTitle>
          <AlertDescription>
            Your project requires packages that are not installed in the backend.
             <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setIsDialogOpen(true)}>
                View details and install.
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

     return (
      <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 !text-green-500" />
        <AlertTitle>All Dependencies Satisfied</AlertTitle>
        <AlertDescription>
         {suggestions.join(' ')}
        </AlertDescription>
      </Alert>
    );

  }

  return (
    <>
        <Card>
            <CardHeader>
                <CardTitle>Dependency Management</CardTitle>
                <CardDescription>Scan the `requirements.txt` from your uploaded project to see if the required Python libraries are installed in the backend environment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    onClick={handleScanDependencies}
                    disabled={isScanning || isInstalling || !isTestDirectoryConfigured}
                    className="w-full"
                >
                    {isScanning || isInstalling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ListChecks className="mr-2 h-4 w-4" />
                    )}
                    {isInstalling ? 'Installing...' : 'Scan Project Dependencies'}
                </Button>
                {renderStatus()}
            </CardContent>
        </Card>
        
        <DependencyStatusDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            scanResult={scanResult}
            onInstall={handleInstallDependencies}
            isInstalling={isInstalling}
        />
    </>

  );
}
