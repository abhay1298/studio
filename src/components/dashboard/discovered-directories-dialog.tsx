
"use client";

import { useExecutionContext } from "@/contexts/execution-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { FolderSymlink, Loader2 } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";

export function DiscoveredDirectoriesDialog() {
    const { 
        discoveredDirectories,
        isDiscovering,
        isSettingDirectory,
        setTestDirectory,
    } = useExecutionContext();

    const isOpen = !!discoveredDirectories;

    // A simple placeholder since we can't close the dialog from here directly
    // The context should set `discoveredDirectories` to null to close it.
    const handleClose = () => {};

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Discovered Test Directories</DialogTitle>
                    <DialogDescription>
                        The backend found the following directories containing `.robot` files. Select one to set it as the active test directory.
                    </DialogDescription>
                </DialogHeader>

                {isDiscovering ? (
                    <div className="flex items-center justify-center gap-4 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Searching file system...</p>
                    </div>
                ) : discoveredDirectories && discoveredDirectories.length > 0 ? (
                    <ScrollArea className="max-h-96 -mx-6 px-6">
                        <div className="space-y-2">
                            {discoveredDirectories.map(dir => (
                                <div key={dir.path} className="flex items-center justify-between p-3 rounded-md border bg-muted/50 hover:bg-muted transition-colors">
                                    <div>
                                        <p className="font-semibold font-mono text-sm">{dir.relative_path}</p>
                                        <p className="text-xs text-muted-foreground">{dir.robot_count} .robot file(s)</p>
                                    </div>
                                    <Button 
                                        size="sm"
                                        onClick={() => setTestDirectory(dir.path)}
                                        disabled={isSettingDirectory}
                                    >
                                        {isSettingDirectory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Set as Active
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <Alert>
                        <FolderSymlink className="h-4 w-4" />
                        <AlertTitle>No Directories Found</AlertTitle>
                        <AlertDescription>
                            The automatic scan could not find any directories containing `.robot` test files on the backend server.
                        </AlertDescription>
                    </Alert>
                )}
            </DialogContent>
        </Dialog>
    )
}
