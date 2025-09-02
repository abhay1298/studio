
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { UploadCloud, Pencil, FolderUp, FileSpreadsheet, GitBranch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExecutionContext } from '@/contexts/execution-context';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type ProjectUploadProps = {
    projectFileName: string | null;
    projectFileSource: 'local' | 'git' | null;
    dataFileName: string | null;
    onProjectFileChange: (files: FileList) => Promise<void>;
    onDataFileChange: (file: File | null) => void;
    onClearProjectFile: () => void;
    onClearDataFile: () => void;
};

export function ProjectUpload({ 
    projectFileName,
    projectFileSource,
    dataFileName,
    onProjectFileChange,
    onDataFileChange,
    onClearProjectFile,
    onClearDataFile,
}: ProjectUploadProps) {
  const router = useRouter();
  const { hasHydrated, isUploadingProject } = useExecutionContext();

  const handleProjectFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await onProjectFileChange(files);
     if (e.target) {
      e.target.value = "";
    }
  };
  
  const handleDataFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    onDataFileChange(file);
    if (e.target) {
      e.target.value = "";
    }
  };
  
  const handleEditClick = () => {
    router.push('/dashboard/data-editor');
  };
  
  const renderLoadingSkeleton = () => (
    <CardContent className="pt-6">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
  );
  
  const getProjectIcon = () => {
    if (projectFileSource === 'git') {
      return <GitBranch className="h-6 w-6 text-primary"/>;
    }
    return <FolderUp className="h-6 w-6 text-primary"/>;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Project Source</CardTitle>
          <CardDescription>
            Upload your Robot Framework project folder to the execution server. This will replace any existing project.
          </CardDescription>
        </CardHeader>
        
        {!hasHydrated ? (
          renderLoadingSkeleton()
        ) : !projectFileName ? (
          <CardContent className="pt-6">
            <Tabs defaultValue="folder">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="folder" disabled={isUploadingProject}><FolderUp className="mr-2 h-4 w-4"/>Upload Local Project</TabsTrigger>
              </TabsList>
              <TabsContent value="folder" className="pt-4">
                <div className="grid gap-2">
                    <Label htmlFor="project-folder-input">Robot Framework Project Folder</Label>
                     <div className="flex items-center gap-2">
                        <Label htmlFor="project-folder-input" className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          buttonVariants({ variant: 'outline' }),
                          isUploadingProject && "cursor-not-allowed opacity-50"
                        )}>
                          {isUploadingProject ? <Loader2 className="h-5 w-5 animate-spin" /> : <FolderUp className="h-5 w-5" />}
                          <span className="font-bold">{isUploadingProject ? 'Uploading...' : 'Choose Folder'}</span>
                        </Label>
                        <Input
                            id="project-folder-input"
                            type="file"
                            className="hidden"
                            onChange={handleProjectFolderChange}
                            webkitdirectory="true"
                            directory=""
                            disabled={isUploadingProject}
                        />
                    </div>
                     <p className="text-xs text-muted-foreground">This will zip and upload the selected folder to the server.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        ) : (
          <CardContent className="pt-6">
              <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          {getProjectIcon()}
                          <div className="flex flex-col">
                              <span className="font-semibold">Active Project</span>
                              <span className="text-sm text-muted-foreground truncate max-w-xs">{projectFileName}</span>
                          </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={onClearProjectFile} disabled={isUploadingProject}>Clear</Button>
                  </div>
              </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Orchestrator Data</CardTitle>
          <CardDescription>
            Upload the Excel or CSV file for data-driven orchestrator runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!hasHydrated ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/2" />
            </div>
          ) : !dataFileName ? (
              <div className="grid gap-2">
              <Label htmlFor="data-file">Test Data File (.xlsx, .csv)</Label>
              <div className="flex items-center gap-2">
                  <Label htmlFor="data-file-input" className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  buttonVariants({ variant: 'outline' })
                  )}>
                  <UploadCloud />
                  <span className="font-bold">Choose file</span>
                  </Label>
                  <Input
                  id="data-file-input"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleDataFileChange}
                  />
              </div>
              </div>
          ) : (
              <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <FileSpreadsheet className="h-6 w-6 text-accent"/>
                          <div className="flex flex-col">
                              <span className="font-semibold">Data File Loaded</span>
                              <span className="text-sm text-muted-foreground truncate max-w-xs">{dataFileName}</span>
                          </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={onClearDataFile}>Clear</Button>
                  </div>
              </div>
          )}
        </CardContent>
        
        {dataFileName && hasHydrated && (
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleEditClick}>
              <Pencil className="mr-2 h-4 w-4" />
              View & Edit Data File
            </Button>
          </CardFooter>
        )}
      </