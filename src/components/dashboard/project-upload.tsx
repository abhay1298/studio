
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
import { UploadCloud, Pencil, FolderUp, FolderArchive, FileSpreadsheet, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExecutionContext } from '@/contexts/execution-context';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';


type ProjectUploadProps = {
    projectFileName: string | null;
    dataFileName: string | null;
    onProjectFileChange: (files: FileList | null) => void;
    onDataFileChange: (file: File | null) => void;
    onClearProjectFile: () => void;
    onClearDataFile: () => void;
    onGitImport: (repoUrl: string) => void;
};

export function ProjectUpload({ 
    projectFileName,
    dataFileName,
    onProjectFileChange,
    onDataFileChange,
    onClearProjectFile,
    onClearDataFile,
    onGitImport
}: ProjectUploadProps) {
  const router = useRouter();
  const { hasHydrated } = useExecutionContext();
  const [gitUrl, setGitUrl] = React.useState('');

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'project' | 'data'
  ) => {
    
    if (fileType === 'project') {
        const files = e.target.files;
        if (files && files.length > 0) {
            onProjectFileChange(files);
        } else {
            onProjectFileChange(null);
        }
    } else if (fileType === 'data') {
        const file = e.target.files?.[0] || null;
        const allowedDataTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
        ];
         if (file && (allowedDataTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
            onDataFileChange(file);
        } else {
            onDataFileChange(null);
        }
    }
     // Reset the input value so the same folder/file can be re-uploaded
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

  return (
    <div className="grid md:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Load Project</CardTitle>
        <CardDescription>
          Choose a local project folder or import from a Git repository.
        </CardDescription>
      </CardHeader>
      
      {!hasHydrated ? (
        renderLoadingSkeleton()
      ) : !projectFileName ? (
        <Tabs defaultValue="folder" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="folder">Upload Folder</TabsTrigger>
              <TabsTrigger value="git">Import from Git</TabsTrigger>
            </TabsList>
            <TabsContent value="folder" className="pt-4">
                <div className="grid gap-2">
                    <Label htmlFor="project-folder">Robot Framework Project Folder</Label>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="project-folder" className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        buttonVariants({ variant: 'outline' })
                        )}>
                        <FolderUp className="h-5 w-5" />
                        <span className="font-bold">Choose Folder</span>
                        </Label>
                        <Input
                            id="project-folder"
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, 'project')}
                            // @ts-ignore
                            webkitdirectory="true"
                            directory="true"
                        />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="git" className="pt-4">
                <div className="grid gap-2">
                    <Label htmlFor="git-url">Git Repository URL</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            id="git-url" 
                            placeholder="https://github.com/user/repo.git"
                            value={gitUrl}
                            onChange={(e) => setGitUrl(e.target.value)}
                        />
                         <Button onClick={() => onGitImport(gitUrl)} disabled={!gitUrl}>
                            <GitBranch className="mr-2 h-4 w-4"/>
                            Import
                        </Button>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
      ) : (
        <CardContent className="pt-6">
             <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FolderArchive className="h-6 w-6 text-primary"/>
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
          Upload and manage the Excel or CSV file for orchestrator runs. This can also be detected from your project folder.
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
                <Label htmlFor="data-file" className={cn(
                "flex items-center gap-2 cursor-pointer",
                buttonVariants({ variant: 'outline' })
                )}>
                <UploadCloud />
                <span className="font-bold">Choose file</span>
                </Label>
                <Input
                id="data-file"
                type="file"
                className="hidden"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => handleFileChange(e, 'data')}
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
