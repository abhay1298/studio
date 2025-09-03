"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { CheckCircle2, AlertTriangle, PackagePlus, Loader2 } from 'lucide-react';
import type { DependencyScanResult } from './dependency-checker';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

type DependencyStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  scanResult: DependencyScanResult | null;
  onInstall: () => void;
  isInstalling: boolean;
};

export function DependencyStatusDialog({ isOpen, onOpenChange, scanResult, onInstall, isInstalling }: DependencyStatusDialogProps) {
  if (!scanResult) return null;

  const { missing_packages, requirements_files, installed_packages_count, errors } = scanResult;
  const missingCount = missing_packages.length;
  const hasErrors = errors.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? <XCircle className="text-destructive"/> : missingCount > 0 ? (
                <AlertTriangle className="text-destructive"/>
            ) : (
                <CheckCircle2 className="text-green-500" />
            )}
            Dependency Scan Results
            </DialogTitle>
          <DialogDescription>
            {hasErrors ? `The scan failed with ${errors.length} error(s).` :
             missingCount > 0 
                ? `Found ${missingCount} missing package(s) from ${requirements_files.length} requirements file(s).` 
                : 'All dependencies are installed and ready to go.'}
          </DialogDescription>
        </DialogHeader>
        
        {hasErrors && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4"/>
                <AlertTitle>Scan Error</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5">
                       {errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )}

        {missingCount > 0 && (
             <ScrollArea className="max-h-80 -mx-6 px-6">
              <div className="space-y-2 py-2">
                <p className="text-sm font-semibold">Missing Packages:</p>
                {missing_packages.map((dep, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                        <span className="font-mono text-sm">{dep.raw_line}</span>
                        <p className="text-xs text-muted-foreground">From: {dep.source_file.split(/\\|\//).pop()}</p>
                    </div>
                    <Badge variant="destructive">
                      Missing
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
        )}
       
        <Alert>
            <AlertTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" />
                Environment Details
            </AlertTitle>
            <AlertDescription>
                <p>Found <strong>{installed_packages_count}</strong> installed packages in the Python environment.</p>
                <p>Scanned <strong>{requirements_files.length}</strong> requirements file(s): {requirements_files.map(f => f.split(/\\|\//).pop()).join(', ')}</p>
            </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
           {missingCount > 0 && !hasErrors && (
                <Button onClick={onInstall} disabled={isInstalling}>
                    {isInstalling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <PackagePlus className="mr-2 h-4 w-4" />
                    )}
                    Install {missingCount} Missing Package(s)
                </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
