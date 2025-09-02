
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
import { CheckCircle2, AlertTriangle, PackagePlus } from 'lucide-react';
import type { DependencyStatus } from './dependency-checker';

type DependencyStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  statuses: DependencyStatus[];
};

export function DependencyStatusDialog({ isOpen, onOpenChange, statuses }: DependencyStatusDialogProps) {
  const missingCount = statuses.filter(s => s.status === 'missing').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {missingCount > 0 ? (
                <AlertTriangle className="text-destructive"/>
            ) : (
                <CheckCircle2 className="text-green-500" />
            )}
            Dependency Scan Results
            </DialogTitle>
          <DialogDescription>
            {missingCount > 0 
                ? `The scan found ${missingCount} missing package(s).` 
                : 'All dependencies are installed and ready to go.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {statuses.map((dep) => (
              <div
                key={dep.library}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <span className="font-mono text-sm">{dep.library}</span>
                <Badge
                  variant={dep.status === 'installed' ? 'default' : 'destructive'}
                  className={dep.status === 'installed' ? 'border-transparent bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400' : ''}
                >
                  {dep.status}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
           {missingCount > 0 && (
                <Button>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Install Missing Libraries
                </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
