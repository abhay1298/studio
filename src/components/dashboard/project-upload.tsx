

"use client";

import * as React from 'react';
import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileCheck2, FileX2, Pencil, GitBranch, Loader2, FolderArchive, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useExecutionContext } from '@/contexts/execution-context';
import { Skeleton } from '../ui/skeleton';


type ProjectUploadProps = {
    projectFileName: string | null;
    dataFileName: string | null;
    onProjectFileChange: (file: File | null) => void;
    onDataFileChange: (file: File | null) => void;
    onClearProjectFile: () => void;
    onClearDataFile: () => void;
};

export function ProjectUpload({ 
    projectFileName,
    dataFileName,
    onProjectFileChange,
    onDataFileChange,
    onClearProjectFile,
    onClearDataFile
}: ProjectUploadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { hasHydrated } = useExecutionContext();
  const [gitUrl, setGitUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'project' | 'data'
  ) => {
    const file = e.target.files?.[0] || null;
    
    if (fileType === 'project') {
        const allowedProjectTypes = ['application/zip', 'application/x-zip-compressed'];
        if (file && (allowedProjectTypes.includes(file.type) || file.name.endsWith('.zip'))) {
            onProjectFileChange(file);
        } else {
            onProjectFileChange(null);
            if (file) { // if a file was selected but it's the wrong type
                toast({
                  variant: 'destructive',
                  title: 'Error: Invalid File Format',
                  description: `Please upload a valid project file (.zip).`,
                  action: <FileX2 className="text-red-500" />,
                });
            }
        }
    } else if (fileType === 'data') {
        const allowedDataTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
        ];
         if (file && (allowedDataTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
            onDataFileChange(file);
        } else {
            onDataFileChange(null);
             if (file) {
                toast({
                  variant: 'destructive',
                  title: 'Error: Invalid File Format',
                  description: `Please upload a valid data file (.xlsx, .csv).`,
                  action: <FileX2 className="text-red-500" />,
                });
            }
        }
    }
     // Reset the input value so the same file can be re-uploaded
    if (e.target) {
      e.target.value = "";
    }
  };
  
  const handleEditClick = () => {
    router.push('/dashboard/data-editor');
  };

  const handleGitImport = () => {
    if (!gitUrl.trim() || !gitUrl.includes('.git')) {
        toast({
            variant: 'destructive',
            title: 'Invalid Git URL',
            description: 'Please enter a valid Git repository URL.',
        });
        return;
    }
    setIsCloning(true);
    // This is a simulation
    setTimeout(() => {
        setIsCloning(false);
        const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'repository';
        const dummyFile = new File([], `${repoName}.zip`, { type: 'application/zip'});
        onProjectFileChange(dummyFile);
        
        toast({
            title: 'Repository Imported',
            description: `Successfully imported project from '${repoName}'.`,
            action: <GitBranch className="text-green-500" />,
        });
    }, 2000);
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
          Upload your project zip or import from Git to get started.
        </CardDescription>
      </CardHeader>
      
      {!hasHydrated ? (
        renderLoadingSkeleton()
      ) : !projectFileName ? (
        <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-6" style={{width: 'calc(100% - 3rem)'}}>
                <TabsTrigger value="git" disabled={isCloning}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Import from Git
                </TabsTrigger>
                <TabsTrigger value="upload" disabled={isCloning}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    File Upload
                </TabsTrigger>
            </TabsList>
             <TabsContent value="git">
                <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-2">
                        <Label htmlFor="git-url">Git Repository URL</Label>
                        <Input 
                            id="git-url" 
                            placeholder="https://github.com/your/repository.git"
                            value={gitUrl}
                            onChange={(e) => setGitUrl(e.target.value)}
                            disabled={isCloning}
                        />
                    </div>
                    <Button onClick={handleGitImport} disabled={isCloning || !gitUrl.trim()} className="w-full">
                        {isCloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                        {isCloning ? 'Importing...' : 'Import Project'}
                    </Button>
                </CardContent>
            </TabsContent>
            <TabsContent value="upload">
                <CardContent className="grid gap-6 pt-6">
                    <div className="grid gap-2">
                    <Label htmlFor="project-file">Robot Framework Project (.zip)</Label>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="project-file" className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        buttonVariants({ variant: 'outline' })
                        )}>
                        <UploadCloud />
                        <span className="font-bold">Choose file</span>
                        </Label>
                        <Input
                        id="project-file"
                        type="file"
                        className="hidden"
                        accept=".zip,.zip-compressed"
                        onChange={(e) => handleFileChange(e, 'project')}
                        />
                    </div>
                    </div>
                </CardContent>
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
