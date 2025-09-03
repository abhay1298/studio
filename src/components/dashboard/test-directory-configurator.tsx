
"use client";

import { useExecutionContext } from "@/contexts/execution-context";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { CheckCircle2, FolderCheck, FolderOpen, FolderSearch, Loader2, ServerCrash } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { DiscoveredDirectoriesDialog } from "./discovered-directories-dialog";
import { Skeleton } from "../ui/skeleton";

export function TestDirectoryConfigurator() {
    const { 
        directoryStatus,
        fetchDirectoryStatus,
        discoverDirectories,
        isDiscovering,
        hasHydrated,
    } = useExecutionContext();

    if (!hasHydrated) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-48" />
            </div>
        )
    }

    if (!directoryStatus) {
        return (
            <Alert variant="destructive">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                    Could not connect to the backend server. Please ensure it's running and accessible.
                    <Button variant="secondary" size="sm" onClick={fetchDirectoryStatus} className="mt-4 ml-auto block">
                        Retry Connection
                    </Button>
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-4">
            {directoryStatus.configured ? (
                <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FolderCheck className="h-8 w-8 text-green-600" />
                                <div>
                                    <h3 className="font-semibold text-green-800 dark:text-green-300">Directory Configured</h3>
                                    <p className="text-sm text-green-700 dark:text-green-400 font-mono" title={directoryStatus.directory}>
                                        {directoryStatus.directory}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-500">
                                        Found {directoryStatus.robot_file_count} .robot file(s).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                 <Alert>
                    <FolderOpen className="h-4 w-4" />
                    <AlertTitle>No Test Directory Configured</AlertTitle>
                    <AlertDescription>
                        The backend server is not pointed to a directory with Robot Framework tests. Use the discovery feature to find one.
                    </AlertDescription>
                </Alert>
            )}

            <Button onClick={discoverDirectories} disabled={isDiscovering}>
                {isDiscovering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderSearch className="mr-2 h-4 w-4" />}
                Discover Test Directories
            </Button>

            <DiscoveredDirectoriesDialog />
        </div>
    )
}
