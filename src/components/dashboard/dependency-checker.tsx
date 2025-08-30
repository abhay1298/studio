

"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ListTodo, PackageCheck, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DependencyStatusDialog } from './dependency-status-dialog';

type Status = 'idle' | 'checking' | 'success' | 'warning' | 'error' | 'installing';
export type DependencyStatus = {
    library: string;
    status: 'installed' | 'missing';
};

type DependencyCheckerProps = {
  requirementsContent: string | null;
  projectIsLoaded: boolean;
};

export function DependencyChecker({ requirementsContent, projectIsLoaded }: DependencyCheckerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [dependencyStatus, setDependencyStatus] = useState<DependencyStatus[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset checker state if the project file is cleared
    if (!projectIsLoaded) {
      setStatus('idle');
      setDependencyStatus([]);
    }
  }, [projectIsLoaded]);

  const handleCheckDependencies = async () => {
    if (!requirementsContent) {
        toast({
            variant: 'destructive',
            title: 'No requirements.txt found',
            description: 'Cannot check dependencies because no requirements.txt was found in the project.',
        });
        setStatus('warning');
        return;
    }
    setStatus('checking');
    try {
      const response = await fetch('/api/check-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: requirementsContent }),
      });
      if (!response.ok) throw new Error('Failed to check dependencies.');

      const result: DependencyStatus[] = await response.json();
      setDependencyStatus(result);
      if (result.every(d => d.status === 'installed')) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to the dependency checker service.' });
      setStatus('idle');
    }
  };

  const handleInstallMissing = () => {
    setStatus('installing');
    toast({
        title: 'Installation in Progress',
        description: 'Simulating installation of missing packages...',
    });
    setTimeout(() => {
        const newStatuses = dependencyStatus.map(d => ({ ...d, status: 'installed' as 'installed' }));
        setDependencyStatus(newStatuses);
        setStatus('success');
        setIsDialogOpen(false);
        toast({
            title: 'Installation Complete',
            description: 'All missing libraries have been "installed".',
            action: <CheckCircle2 className="text-green-500" />
        });
    }, 2000);
  };

  const missingCount = dependencyStatus.filter(d => d.status === 'missing').length;

  return (
    <>
      <div className="grid gap-4">
        <Button onClick={handleCheckDependencies} disabled={status === 'checking' || !projectIsLoaded}>
          {status === 'checking' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
          Scan Dependencies
        </Button>
        {status === 'warning' && (
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
          status={dependencyStatus}
          onInstall={handleInstallMissing}
          isInstalling={status === 'installing'}
      />
    </>
  );
}

    