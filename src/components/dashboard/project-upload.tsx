"use client";

import React, { useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadCloud, Folder, File, X, FileCheck2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

type ProjectFileSource = 'local' | 'git';

type ProjectUploadProps = {
    projectFileName: string | null;
    projectFileSource: ProjectFileSource | null;
    dataFileName: string | null;
    onProjectFileChange: (file: File) => void;
    onDataFileChange: (file: File) => void;
    onClearProjectFile: () => void;
    onClearDataFile: () => void;
}

export function ProjectUpload({
    projectFileName,
    projectFileSource,
    dataFileName,
    onProjectFileChange,
    onDataFileChange,
    onClearProjectFile,
    onClearDataFile
}: ProjectUploadProps) {
    const { toast } = useToast();
    const projectInputRef = useRef<HTMLInputElement>(null);
    const dataInputRef = useRef<HTMLInputElement>(null);

    const createUploadHandler = (handler: (file: File) => void, fileType: 'project' | 'data') => 
        (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handler(file);
             toast({
                title: `${fileType === 'project' ? 'Project' : 'Data'} file loaded`,
                description: `${file.name} is ready for processing.`,
                action: <FileCheck2 className="text-green-500" />
            });
        }
    };
    
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>1. Load Robot Framework Project</CardTitle>
                    <CardDescription>Upload a .zip file of your project or connect to a Git repository.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {projectFileName ? (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                           <div className="flex items-center gap-3">
                                {projectFileSource === 'git' ? (
                                    <GitBranch className="h-5 w-5 text-primary" />
                                ) : (
                                    <Folder className="h-5 w-5 text-primary" />
                                )}
                                <span className="font-medium">{projectFileName}</span>
                           </div>
                            <Button variant="ghost" size="icon" onClick={onClearProjectFile}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div 
                                onClick={() => projectInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                            >
                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm font-semibold">Upload a .zip file</p>
                                <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
                            </div>
                            <Input 
                                ref={projectInputRef}
                                type="file" 
                                className="hidden" 
                                accept=".zip"
                                onChange={createUploadHandler(onProjectFileChange, 'project')}
                            />
                             <div className="flex items-center gap-2">
                                <Separator className="flex-1" />
                                <span className="text-xs text-muted-foreground">OR</span>
                                <Separator className="flex-1" />
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="https://github.com/user/robot-repo.git" />
                                <Button className="w-full" variant="secondary" onClick={() => toast({ title: "Coming soon!", description: "Cloning from Git is not yet implemented."})}>
                                    <GitBranch className="mr-2 h-4 w-4"/>
                                    Connect to Git Repository
                                </Button>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Load Test Data (Optional)</CardTitle>
                    <CardDescription>Upload a .csv or .xlsx file for data-driven testing with the Orchestrator.</CardDescription>
                </CardHeader>
                <CardContent>
                    {dataFileName ? (
                         <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                                <File className="h-5 w-5 text-primary" />
                                <span className="font-medium">{dataFileName}</span>
                           </div>
                            <Button variant="ghost" size="icon" onClick={onClearDataFile}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                         <div 
                            onClick={() => dataInputRef.current?.click()}
                            className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors h-full"
                        >
                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm font-semibold">Upload a .csv or .xlsx file</p>
                        </div>
                    )}
                     <Input 
                        ref={dataInputRef}
                        type="file" 
                        className="hidden" 
                        accept=".csv,.xlsx"
                        onChange={createUploadHandler(onDataFileChange, 'data')}
                    />
                </CardContent>
            </Card>
        </div>
    );
}