
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  projectFile: File | null;
};

export function DependencyChecker({ projectFile }: DependencyCheckerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [dependencyStatus, setDependencyStatus] = useState<DependencyStatus[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requirementsContent, setRequirementsContent] = useState<string | null>(null);
  const { toast } = useToast();

  const getRequirementsFromZip = useCallback(async () => {
    if (!projectFile) return null;
    // This is a placeholder. In a real app with a library like JSZip,
    // you would unzip and read the file here.
    // For now, we'll assume a dummy requirements.txt for demonstration.
    if (projectFile.name.includes('no-deps')) {
        return null; // Simulate no requirements.txt
    }
    if (projectFile.name.includes('all-missing')) {
        return 'robotframework-requests\nrobotframework-seleniumlibrary\nrobotframework-faker';
    }
    return 'robotframework-requests\nrobotframework-seleniumlibrary';

  }, [projectFile]);


  useEffect(() => {
    const processFile = async () => {
        setStatus('idle');
        setDependencyStatus([]);
        const reqContent = await getRequirementsFromZip();
        setRequirementsContent(reqContent);
    };
    processFile();
  }, [projectFile, getRequirementsFromZip]);


  const handleCheckDependencies = async () => {
    if (!requirementsContent) {
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
        description: 'This may take a moment...',
    });
    setTimeout(() => {
        const newStatuses = dependencyStatus.map(d => ({ ...d, status: 'installed' as 'installed' }));
        setDependencyStatus(newStatuses);
        setStatus('success');
        setIsDialogOpen(false);
        toast({
            title: 'Installation Complete',
            description: 'All missing libraries have been installed.',
            action: <CheckCircle2 className="text-green-500" />
        });
    }, 3000);
  };

  const missingCount = dependencyStatus.filter(d => d.status === 'missing').length;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Dependency Checker</CardTitle>
        <CardDescription>
          {projectFile ? "Scan your project for missing libraries." : "Upload a project to scan dependencies."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button onClick={handleCheckDependencies} disabled={status === 'checking' || !projectFile}>
          {status === 'checking' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
          Scan Dependencies
        </Button>
        {status === 'warning' && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>A `requirements.txt` file was not found in your project zip.</AlertDescription>
            </Alert>
        )}
        {status === 'success' && (
             <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
                <PackageCheck className="h-4 w-4 !text-green-500" />
                <AlertTitle>All Dependencies Installed</AlertTitle>
                <AlertDescription>Your environment is ready for execution.</AlertDescription>
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

      </CardContent>
    </Card>
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
