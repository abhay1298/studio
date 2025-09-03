"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { DependencyStatusDialog } from './dependency-status-dialog';
import { useToast } from '@/hooks/use-toast';

export type DependencyStatus = {
  library: string;
  status: 'installed' | 'missing';
};

type DependencyCheckerProps = {
    requirementsContent: string;
    projectIsLoaded: boolean;
}

export function DependencyChecker({ requirementsContent, projectIsLoaded }: DependencyCheckerProps) {
  const [dependencyStatus, setDependencyStatus] = useState<DependencyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset status when project context changes
    setDependencyStatus([]);
    setError(null);
  }, [requirementsContent, projectIsLoaded]);


  const handleCheckDependencies = async () => {
    setIsLoading(true);
    setError(null);
    setDependencyStatus([]);

    if (!requirementsContent) {
        setError("No requirements.txt found in the uploaded project.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/check-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: requirementsContent }),
      });
      if (!response.ok) {
        throw new Error('Failed to check dependencies on the server.');
      }
      const data: DependencyStatus[] = await response.json();
      setDependencyStatus(data);
      if (data.length > 0) {
        setIsDialogOpen(true);
      } else {
        toast({
            title: "No dependencies found",
            description: "Your requirements.txt seems to be empty."
        })
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummary = () => {
    if (isLoading) {
      return (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Checking...</AlertTitle>
          <AlertDescription>
            Comparing your requirements against the environment.
          </AlertDescription>
        </Alert>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (dependencyStatus.length === 0) {
      return null;
    }

    const missingCount = dependencyStatus.filter(
      (dep) => dep.status === 'missing'
    ).length;

    if (missingCount > 0) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Dependencies</AlertTitle>
          <AlertDescription>
            {missingCount} package(s) are missing.
             <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setIsDialogOpen(true)}>
                View details.
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 !text-green-500" />
        <AlertTitle>Dependencies Satisfied</AlertTitle>
        <AlertDescription>
          All required packages are installed.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <>
        <div className="grid gap-4">
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>How this works</AlertTitle>
                <AlertDescription>This tool scans your project for a `requirements.txt` file and checks if the libraries are available. This is a simulation - a real implementation would check a live Python environment.</AlertDescription>
            </Alert>
             <Button
                onClick={handleCheckDependencies}
                disabled={isLoading || !projectIsLoaded}
                className="w-full sm:w-auto"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Scan and Check Dependencies
            </Button>
            {renderSummary()}
        </div>
        <DependencyStatusDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            statuses={dependencyStatus}
        />
    </>

  );
}