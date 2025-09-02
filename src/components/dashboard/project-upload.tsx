
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
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
import { useToast } from '@/hooks/use-toast';

type ProjectUploadProps = {
    projectFileName: string | null;
    projectFileSource: 'local' | 'git' | null;
    dataFileName: string | null;
    onProjectFileChange: (files: FileList | null) => void;
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
  const { toast } = useToast();
  const { hasHydrated, handleGitImport } = useExecutionContext();
  const [gitUrl, setGitUrl] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

  const handleProjectFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    toast({ title: 'Zipping project folder...', description: 'Please wait, this may take a moment for large projects.' });

    try {
        const zip = new JSZip();
        const rootFolderName = files[0].webkitRelativePath.split('/')[0];
        const root = zip.folder(rootFolderName);

        if (!root) {
            throw new Error("Could not create zip folder.");
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = file.webkitRelativePath;
            // We want to keep the root folder in the zip, so we don't strip it.
            root.file(relativePath.substring(rootFolderName.length + 1), file);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFile = new File([zipBlob], `${rootFolderName}.zip`, { type: 'application/zip' });

        const formData = new FormData();
        formData.append('project', zipFile);

        const response = await fetch('/api/upload-project', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload project to the backend.');
        }

        await onProjectFileChange(files);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        toast({
            variant: 'destructive',
            title: 'Project Upload Failed',
            description: errorMessage,
        });
    } finally {
        setIsUploading(false);
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
  
  const handleGitImportClick = () => {
    handleGitImport(gitUrl);
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
          <CardTitle className="font-headline">Load Project</CardTitle>
          <CardDescription>
            Choose a local project folder to upload it to the execution server.
          </CardDescription>
        </CardHeader>
        
        {!hasHydrated ? (
          renderLoadingSkeleton()
        ) : !projectFileName ? (
          <CardContent className="pt-6">
            <Tabs defaultValue="folder">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="folder"><FolderUp className="mr-2 h-4 w-4"/>Upload Local Project</TabsTrigger>
              </TabsList>
              <TabsContent value="folder" className="pt-4">
                <div className="grid gap-2">
                    <Label htmlFor="project-folder-input">Robot Framework Project Folder</Label>
                     <div className="flex items-center gap-2">
                        <Label htmlFor="project-folder-input" className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          buttonVariants({ variant: 'outline' }),
                          isUploading && "cursor-not-allowed opacity-50"
                        )}>
                          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FolderUp className="h-5 w-5" />}
                          <span className="font-bold">{isUploading ? 'Uploading...' : 'Choose Folder'}</span>
                        </Label>
                        <Input
                            id="project-folder-input"
                            type="file"
                            className="hidden"
                            onChange={handleProjectFolderChange}
                            webkitdirectory="true"
                            directory=""
                            disabled={isUploading}
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
                      <Button variant="destructive" size="sm" onClick={onClearProjectFile}>Clear</Button>
                  </div>
              </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Orchestrator Data</CardTitle>
          <CardDescription>
            Upload and manage the Excel or CSV file for orchestrator runs.
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
      </Card>
    </div>
  );
}

    