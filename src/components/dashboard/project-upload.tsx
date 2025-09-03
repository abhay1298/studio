"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCheck2, Folder, Loader2, UploadCloud, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExecutionContext } from '@/contexts/execution-context';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function ProjectUpload() {
    const { toast } = useToast();
    const { 
        projectFile, 
        setProjectFile, 
        projectUploadStatus, 
        handleProjectUpload,
        activeTestDirectory,
        isTestDirectoryConfigured
    } = useExecutionContext();
    const projectInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
                setProjectFile(file);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Invalid File Type',
                    description: 'Please upload a .zip file containing your Robot Framework project.',
                });
            }
        }
    };

    const handleClearFile = () => {
        setProjectFile(null);
        if (projectInputRef.current) {
            projectInputRef.current.value = '';
        }
    }
    
    const renderContent = () => {
        if (isTestDirectoryConfigured && !projectFile) {
            return (
                <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
                    <FileCheck2 className="h-4 w-4 !text-green-500"/>
                    <AlertTitle>Project Loaded</AlertTitle>
                    <AlertDescription className="truncate">
                        Active directory: <strong>{activeTestDirectory}</strong>
                    </AlertDescription>
                </Alert>
            );
        }

        if (projectFile) {
            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                            <Folder className="h-5 w-5 text-primary" />
                            <span className="font-medium">{projectFile.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleClearFile}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                     <Button 
                        onClick={() => handleProjectUpload(projectFile)} 
                        disabled={projectUploadStatus === 'uploading'}
                        className="w-full"
                    >
                        {projectUploadStatus === 'uploading' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <UploadCloud className="mr-2 h-4 w-4" />
                        )}
                        Upload and Set as Active
                    </Button>
                </div>
            )
        }

        return (
            <div 
                onClick={() => projectInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">Upload a .zip file</p>
                <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
            </div>
        )
    }

    return (
        <div>
            <Input 
                ref={projectInputRef}
                type="file" 
                className="hidden" 
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileSelect}
            />
            {renderContent()}
        </div>
    );
}
