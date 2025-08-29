
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
import { Loader2, PackageCheck, PackagePlus, AlertTriangle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import type { DependencyStatus } from './dependency-checker';
import { Badge } from "../ui/badge";

type DependencyStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  status: DependencyStatus[];
  onInstall: () => void;
  isInstalling: boolean;
};

export function DependencyStatusDialog({ 
    isOpen, 
    onOpenChange, 
    status, 
    onInstall,
    isInstalling
}: DependencyStatusDialogProps) {

  const missingDependencies = status.filter(d => d.status === 'missing');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <AlertTriangle className="text-destructive" />
            Missing Dependencies
          </DialogTitle>
          <DialogDescription>
            The following libraries from your `requirements.txt` are missing from the execution environment.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-60 -mx-6 px-6">
            <div className="space-y-2 py-4">
                {status.map(({library, status}) => (
                     <div key={library} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="font-mono text-sm">{library}</span>
                        <Badge variant={status === 'installed' ? 'default' : 'destructive'} className={status === 'installed' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/20' : ''}>
                            {status === 'installed' ? <PackageCheck className="mr-1.5 h-3 w-3"/> : <AlertTriangle className="mr-1.5 h-3 w-3"/>}
                            {status}
                        </Badge>
                     </div>
                ))}
            </div>
        </ScrollArea>
        

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onInstall} disabled={isInstalling || missingDependencies.length === 0}>
            {isInstalling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
            Install {missingDependencies.length} Missing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
