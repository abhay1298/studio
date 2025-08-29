
"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Status = 'idle' | 'checking' | 'success' | 'warning' | 'error';
type DependencyCheckerProps = {
  isProjectFileUploaded: boolean;
};

const missingLibraries = ['robotframework-requests', 'robotframework-seleniumlibrary'];

export function DependencyChecker({ isProjectFileUploaded }: DependencyCheckerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [isInstalling, setIsInstalling] = useState(false);
  const { toast } = useToast();


  const handleCheckDependencies = () => {
    setStatus('checking');
    setTimeout(() => {
      // Randomly pick a status for demonstration
      const randomStatus = ['success', 'warning', 'error'][Math.floor(Math.random() * 3)] as Status;
      setStatus(randomStatus);
    }, 1500);
  };

  const handleInstallMissing = () => {
    setIsInstalling(true);
    toast({
        title: 'Installation in Progress',
        description: 'Installing missing libraries... This may take a moment.',
    });
    setTimeout(() => {
        setIsInstalling(false);
        setStatus('success');
        toast({
            title: 'Installation Complete',
            description: 'All missing libraries have been installed.',
        });
    }, 3000);
  };

  const renderStatus = () => {
    switch (status) {
      case 'checking':
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Checking...</AlertTitle>
            <AlertDescription>Scanning your project dependencies.</AlertDescription>
          </Alert>
        );
      case 'success':
        return (
          <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 !text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>All required items are installed.</AlertDescription>
          </Alert>
        );
      case 'warning':
        return (
          <Alert className="border-yellow-500/50 text-yellow-700 dark:border-yellow-500/50 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 !text-yellow-500" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>requirements.txt not found. Please provide one for a complete check.</AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Missing Dependencies</AlertTitle>
            <AlertDescription>
              The following libraries are missing:
              <ul className="list-disc pl-5 mt-2">
                {missingLibraries.map(lib => <li key={lib}>{lib}</li>)}
              </ul>
            </AlertDescription>
            <Button size="sm" className="mt-4 w-full" onClick={handleInstallMissing} disabled={isInstalling}>
                {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Install Missing Libraries
            </Button>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Dependency Checker</CardTitle>
        <CardDescription>
          Upload a project to scan for missing libraries.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button onClick={handleCheckDependencies} disabled={status === 'checking' || !isProjectFileUploaded}>
          {status === 'checking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Check Dependencies
        </Button>
        {status !== 'idle' && <div className="mt-4">{renderStatus()}</div>}
      </CardContent>
    </Card>
  );
}
