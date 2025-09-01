
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
import { Loader2, PackageCheck, PackagePlus, AlertTriangle, XCircle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import type { DependencyScanResult } from './dependency-checker';
import { Badge } from "../ui/badge";

type DependencyStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  result: DependencyScanResult | null;
  onInstall: () => void;
  isInstalling: boolean;
};

export function DependencyStatusDialog({ 
    isOpen, 
    onOpenChange, 
    result, 
    onInstall,
    isInstalling
}: DependencyStatusDialogProps) {

  if (!result) return null;

  const { missing_packages, version_conflicts } = result;
  const hasMissing = missing_packages.length > 0;
  const hasConflicts = version_conflicts.length > 0;
  
  const getIssueTitle = () => {
    if (hasMissing && hasConflicts) return "Missing Packages & Version Conflicts";
    if (hasMissing) return "Missing Dependencies";
    if (hasConflicts) return "Version Conflicts";
    return "Dependency Status"
  }
  
  const getIcon = () => {
    if (hasMissing) return <AlertTriangle className="text-destructive" />;
    if (hasConflicts) return <XCircle className="text-destructive" />;
    return <PackageCheck className="text-green-500" />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            {getIcon()}
            {getIssueTitle()}
          </DialogTitle>
          <DialogDescription>
            The backend scan found the following issues with your project's dependencies.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-80 -mx-6 px-6">
            <div className="space-y-4 py-2">
                {hasMissing && (
                    <div>
                        <h3 className="font-semibold mb-2">Missing Packages</h3>
                        <div className="space-y-2">
                           {missing_packages.map((pkg) => (
                                <div key={pkg.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                    <div className="font-mono text-sm">
                                        <p>{pkg.name}</p>
                                        <p className="text-xs text-muted-foreground">{pkg.source_file}</p>
                                    </div>
                                    <Badge variant="destructive">Missing</Badge>
                                </div>
                           ))}
                        </div>
                    </div>
                )}
                {hasConflicts && (
                     <div>
                        <h3 className="font-semibold mb-2">Version Conflicts</h3>
                        <div className="space-y-2">
                            {version_conflicts.map((pkg) => (
                                <div key={pkg.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                    <div className="font-mono text-sm">
                                        <p>{pkg.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Required: {pkg.required_spec}, Installed: {pkg.installed_version}
                                        </p>
                                    </div>
                                    <Badge variant="destructive">Conflict</Badge>
                                </div>
                            ))}
                        </div>
                     </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onInstall} disabled={isInstalling || !hasMissing}>
            {isInstalling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
            Install {missing_packages.length} Missing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
