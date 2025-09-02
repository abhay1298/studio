
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { DependencyStatusDialog } from './dependency-status-dialog';

export type DependencyStatus = {
  library: string;
  status: 'installed' | 'missing';
};

export function DependencyChecker() {
  const [requirements, setRequirements] = useState<string>('');
  const [dependencyStatus, setDependencyStatus] = useState<
    DependencyStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setRequirements(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCheckDependencies = async () => {
    setIsLoading(true);
    setError(null);
    setDependencyStatus([]);
    try {
      const response = await fetch('/api/check-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements }),
      });
      if (!response.ok) {
        throw new Error('Failed to check dependencies on the server.');
      }
      const data: DependencyStatus[] = await response.json();
      setDependencyStatus(data);
      if(data.some(d => d.status === 'missing')){
        setIsDialogOpen(true);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label
                        htmlFor="requirements-file"
                        className="block text-sm font-medium text-foreground"
                    >
                        Upload requirements.txt
                    </label>
                    <input
                        id="requirements-file"
                        type="file"
                        accept=".txt"
                        onChange={handleFileRead}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={handleCheckDependencies}
                        disabled={!requirements || isLoading}
                        className="w-full"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Check Dependencies
                    </Button>
                </div>
            </div>
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

    