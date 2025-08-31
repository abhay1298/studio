
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ListTodo, PackageCheck, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DependencyStatusDialog } from './dependency-status-dialog';
import { useExecutionContext } from '@/contexts/execution-context';

export type DependencyStatus = {
    library: string;
    status: 'installed' | 'missing';
};

type DependencyCheckerProps = {
  requirementsContent: string | null;
  projectIsLoaded: boolean;
};

export function DependencyChecker({ requirementsContent, projectIsLoaded }: DependencyCheckerProps) {
  const { 
    checkDependencies, 
    dependencyCheckResult, 
    isCheckingDependencies, 
    installDependencies
  } = useExecutionContext();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Determine status based on context state
  const status = (() => {
    if (isCheckingDependencies) return 'checking';
    if (!dependencyCheckResult) return 'idle';
    if (dependencyCheckResult.every(d => d.status === 'installed')) return 'success';
    if (dependencyCheckResult.some(d => d.status === 'missing')) return 'error';
    return 'idle';
  })();
  
  const handleInstallMissing = () => {
    setIsInstalling(true);
    installDependencies();
    setTimeout(() => {
        setIsInstalling(false);
        setIsDialogOpen(false);
    }, 2000);
  };
  
  const missingCount = dependencyCheckResult?.filter(d => d.status === 'missing').length || 0;

  return (
    <>
      <div className="grid gap-4">
        <Button onClick={checkDependencies} disabled={isCheckingDependencies || !projectIsLoaded}>
          {isCheckingDependencies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
          Scan Dependencies
        </Button>
        {!requirementsContent && projectIsLoaded && status !== 'checking' && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>A `requirements.txt` file was not found in your project.</AlertDescription>
            </Alert>
        )}
        {status === 'success' && (
             <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
                <PackageCheck className="h-4 w-4 !text-green-500" />
                <AlertTitle>All Dependencies Installed</AlertTitle>
                <AlertDescription>Your environment appears to be ready for execution.</AlertDescription>
            </Alert>
        )}
        {status === 'error' && (
             <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Missing Dependencies Found</AlertTitle>
                <AlertDescription>
                    {missingCount} required librar{missingCount > 1 ? 'ies are' : 'y is'} missing.
                </AlertDescription>
                <Button size="sm" className="mt-4 w-full" onClick={() => setIsDialogOpen(true)}>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    View & Install
                </Button>
            </Alert>
        )}
      </div>
      <DependencyStatusDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          status={dependencyCheckResult || []}
          onInstall={handleInstallMissing}
          isInstalling={isInstalling}
      />
    </>
  );
}
