
"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { UploadCloud, FileCheck2, FileWarning, FileX2, Pencil, GitBranch, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type ProjectUploadProps = {
  onProjectFileChange: (file: File | null) => void;
};

// Helper to create a mock data file for the simulation
const createMockDataFile = () => {
    const csvContent = `test_case,user,password,id,priority
TC_001,user1,pass1,TC_001,High
TC_002,user2,pass2,TC_002,Medium`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    return new File([blob], "test_data.csv", { type: "text/csv" });
};

export function ProjectUpload({ onProjectFileChange }: ProjectUploadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    // Restore state from sessionStorage on component mount
    const storedProjectFileName = sessionStorage.getItem('uploadedProjectFileName');
    if (storedProjectFileName) {
        const dummyFile = new File([], storedProjectFileName, { type: 'application/zip'});
        setProjectFile(dummyFile);
        onProjectFileChange(dummyFile);
    }
    const storedDataFileName = sessionStorage.getItem('uploadedDataFileName');
    if (storedDataFileName) {
        const dummyDataFile = new File([], storedDataFileName, { type: 'text/csv' });
        setDataFile(dummyDataFile);
    }
  }, [onProjectFileChange]);


  // This function will be called to simulate loading a data file
  const autoLoadDataFile = (foundFile: File) => {
    setDataFile(foundFile);
    const reader = new FileReader();
    reader.onload = function(event) {
        if (typeof window !== 'undefined' && event.target?.result) {
            sessionStorage.setItem('uploadedDataFile', event.target.result as string);
            sessionStorage.setItem('uploadedDataFileName', foundFile.name);
            // Clear any old edited data
            sessionStorage.removeItem('editedDataHeaders');
            sessionStorage.removeItem('editedDataRows');
            // This event tells other components that the data file has changed
            window.dispatchEvent(new Event('storage'));
        }
    };
    reader.readAsDataURL(foundFile);
    toast({
        title: 'Orchestrator File Found',
        description: `Automatically loaded '${foundFile.name}' from your project.`,
        action: <FileCheck2 className="text-green-500" />,
    });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'project' | 'data'
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (fileType === 'project') {
        onProjectFileChange(null);
        setProjectFile(null);
        sessionStorage.removeItem('uploadedProjectFileName');
      }
      if (fileType === 'data') {
        setDataFile(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('uploadedDataFile');
          sessionStorage.removeItem('uploadedDataFileName');
          sessionStorage.removeItem('editedDataHeaders');
          sessionStorage.removeItem('editedDataRows');
          window.dispatchEvent(new Event('storage'));
        }
      }
      return;
    }

    const allowedProjectTypes = ['application/zip', 'application/x-zip-compressed'];
    const allowedDataTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    let isValid = false;

    if (fileType === 'project') {
      if (allowedProjectTypes.includes(file.type)) {
        isValid = true;
        setProjectFile(file);
        onProjectFileChange(file);
        sessionStorage.setItem('uploadedProjectFileName', file.name);
        // SIMULATION: Check if project contains a data file
        if (file.name.includes("with-data")) {
            const mockData = createMockDataFile();
            autoLoadDataFile(mockData);
        }
      } else {
        onProjectFileChange(null);
        setProjectFile(null);
        sessionStorage.removeItem('uploadedProjectFileName');
      }
    } else if (fileType === 'data') {
      if (allowedDataTypes.includes(file.type)) {
        isValid = true;
        setDataFile(file);
        const reader = new FileReader();
        reader.onload = function(event) {
          if (typeof window !== 'undefined' && event.target?.result) {
            sessionStorage.setItem('uploadedDataFile', event.target.result as string);
            sessionStorage.setItem('uploadedDataFileName', file.name);
            // Clear any old edited data when a new file is uploaded
            sessionStorage.removeItem('editedDataHeaders');
            sessionStorage.removeItem('editedDataRows');
            window.dispatchEvent(new Event('storage'));
          }
        };
        reader.readAsDataURL(file);
      } else {
        setDataFile(null);
         if (typeof window !== 'undefined') {
          sessionStorage.removeItem('uploadedDataFile');
          sessionStorage.removeItem('uploadedDataFileName');
          sessionStorage.removeItem('editedDataHeaders');
          sessionStorage.removeItem('editedDataRows');
          window.dispatchEvent(new Event('storage'));
        }
      }
    }

    if (isValid) {
      toast({
        title: 'File Uploaded Successfully',
        description: `${file.name}`,
        action: <FileCheck2 className="text-green-500" />,
      });
    } else {
       if (file.size === 0) {
        toast({
          variant: 'destructive',
          title: 'Warning: Empty File',
          description: `${file.name} appears to be empty.`,
          action: <FileWarning className="text-yellow-500" />,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error: Invalid File Format',
          description: `Please upload a valid ${fileType} file.`,
          action: <FileX2 className="text-red-500" />,
        });
      }
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
    setTimeout(() => {
        setIsCloning(false);
        const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'repository';
        const dummyFile = new File([], `${repoName}.zip`, { type: 'application/zip'});
        setProjectFile(dummyFile);
        onProjectFileChange(dummyFile);
        sessionStorage.setItem('uploadedProjectFileName', dummyFile.name);
        toast({
            title: 'Repository Cloned',
            description: `Successfully imported project from '${repoName}'.`,
            action: <GitBranch className="text-green-500" />,
        });

        // SIMULATION: Check if imported project contains a data file
        if (repoName.includes("with-data")) {
            const mockData = createMockDataFile();
            autoLoadDataFile(mockData);
        }

    }, 2000);
  };
  
  const handleClearProject = () => {
    setProjectFile(null);
    onProjectFileChange(null);
    sessionStorage.removeItem('uploadedProjectFileName');
    toast({
        title: 'Project Cleared',
        description: 'The active project has been unloaded.',
    });
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Project Management</CardTitle>
        <CardDescription>
          Upload your project files or import from a Git repository.
        </CardDescription>
      </CardHeader>
      
      {projectFile ? (
        <CardContent className="space-y-4">
            <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
                <FileCheck2 className="h-4 w-4 !text-green-500" />
                <AlertTitle>Active Project: {projectFile.name}</AlertTitle>
                <AlertDescription>
                    The application will use this project for execution.
                </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={handleClearProject}>
                <XCircle className="mr-2 h-4 w-4" />
                Clear Active Project
            </Button>
        </CardContent>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    File Upload
                </TabsTrigger>
                <TabsTrigger value="git">
                    <GitBranch className="mr-2 h-4 w-4" />
                    Import from Git
                </TabsTrigger>
            </TabsList>
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
                        accept=".zip"
                        onChange={(e) => handleFileChange(e, 'project')}
                        />
                        {projectFile && <span className="text-sm text-muted-foreground truncate">{projectFile.name}</span>}
                    </div>
                    </div>
                </CardContent>
            </TabsContent>
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
                    <Button onClick={handleGitImport} disabled={isCloning} className="w-full">
                        {isCloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                        {isCloning ? 'Importing...' : 'Import Project'}
                    </Button>
                </CardContent>
            </TabsContent>
        </Tabs>
      )}

      <Separator className="my-4" />

      <CardHeader className="pt-0">
         <CardTitle className="font-headline text-lg">Orchestrator Data</CardTitle>
         <CardDescription>
          Upload and manage the Excel or CSV file for orchestrator runs.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              accept=".xlsx,.csv"
              onChange={(e) => handleFileChange(e, 'data')}
              />
              {dataFile && <span className="text-sm text-muted-foreground truncate">{dataFile.name}</span>}
          </div>
        </div>
      </CardContent>
       
       {dataFile && (
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={handleEditClick}>
            <Pencil className="mr-2 h-4 w-4" />
            View & Edit Data File
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

const Separator = React.forwardRef<
  React.ElementRef<'div'>,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("shrink-0 bg-border h-[1px] w-full", className)} {...props} />
));
Separator.displayName = 'Separator';

    