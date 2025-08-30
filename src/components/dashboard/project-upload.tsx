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
import { UploadCloud, FileCheck2, FileWarning, FileX2, Pencil, GitBranch, Loader2, FolderArchive, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import * as JSZip from 'jszip';


type ProjectUploadProps = {
};

// Helper to create a mock data file for the simulation
const createMockDataFile = (content: string | ArrayBuffer, name: string): File => {
    const blob = new Blob([content]);
    return new File([blob], name);
};


export function ProjectUpload(props: ProjectUploadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  React.useEffect(() => {
    // Restore file state from sessionStorage on component mount
    const storedProjectFileName = sessionStorage.getItem('uploadedProjectFileName');
     if (storedProjectFileName) {
        const dummyProjectFile = new File([], storedProjectFileName, { type: 'application/zip' });
        setProjectFile(dummyProjectFile);
    }
    const storedDataFileName = sessionStorage.getItem('uploadedDataFileName');
    if (storedDataFileName) {
        const dummyDataFile = new File([], storedDataFileName, { type: 'text/csv' });
        setDataFile(dummyDataFile);
    }
  }, []);

  const clearProjectFile = () => {
    setProjectFile(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('uploadedProjectFileName');
      window.dispatchEvent(new CustomEvent('projectUpdated'));
    }
    toast({ title: 'Project Cleared', description: 'The active project has been removed.' });
  };
  
  const clearDataFile = () => {
    setDataFile(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('uploadedDataFile');
      sessionStorage.removeItem('uploadedDataFileName');
      sessionStorage.removeItem('editedDataHeaders');
      sessionStorage.removeItem('editedDataRows');
      window.dispatchEvent(new Event('storage'));
    }
    toast({ title: 'Data File Cleared', description: 'The orchestrator data file has been removed.' });
  };


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

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'project' | 'data'
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (fileType === 'project') clearProjectFile();
      if (fileType === 'data') clearDataFile();
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
        sessionStorage.setItem('uploadedProjectFileName', file.name);

        // Check for data file inside zip
        try {
            const zip = await JSZip.loadAsync(file);
            let dataFileFound: JSZip.JSZipObject | null = null;
            zip.forEach((relativePath, zipEntry) => {
                if (relativePath.toLowerCase().endsWith('.csv') || relativePath.toLowerCase().endsWith('.xlsx')) {
                    dataFileFound = zipEntry;
                }
            });

            if (dataFileFound) {
                const content = await dataFileFound.async('arraybuffer');
                const mockFile = createMockDataFile(content, dataFileFound.name);
                autoLoadDataFile(mockFile);
            }
        } catch (error) {
            console.error("Error reading zip file:", error);
            toast({ variant: 'destructive', title: 'Could not inspect zip file.' });
        }
        
      } else {
        setProjectFile(null);
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
            sessionStorage.removeItem('editedDataHeaders');
            sessionStorage.removeItem('editedDataRows');
            window.dispatchEvent(new Event('storage'));
          }
        };
        reader.readAsDataURL(file);
      } else {
        setDataFile(null);
      }
    }

    if (isValid) {
      toast({
        title: 'File Uploaded Successfully',
        description: `${file.name}`,
        action: <FileCheck2 className="text-green-500" />,
      });
      if (fileType === 'project') {
        window.dispatchEvent(new CustomEvent('projectUpdated'));
      }
    } else {
        toast({
          variant: 'destructive',
          title: 'Error: Invalid File Format',
          description: `Please upload a valid ${fileType} file.`,
          action: <FileX2 className="text-red-500" />,
        });
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
        setProjectFile(dummyFile);
        sessionStorage.setItem('uploadedProjectFileName', dummyFile.name);
        window.dispatchEvent(new CustomEvent('projectUpdated'));
        
        toast({
            title: 'Repository Imported',
            description: `Successfully imported project from '${repoName}'.`,
            action: <GitBranch className="text-green-500" />,
        });
    }, 2000);
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Load Project</CardTitle>
        <CardDescription>
          Upload your project zip or import from Git to get started. Note: This does not transfer files to the backend; it's for UI simulation.
        </CardDescription>
      </CardHeader>
      
      {!projectFile ? (
        <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-6" style={{width: 'calc(100% - 3rem)'}}>
                <TabsTrigger value="upload" disabled={isCloning}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    File Upload
                </TabsTrigger>
                <TabsTrigger value="git" disabled={isCloning}>
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
                        accept=".zip,.zip-compressed"
                        onChange={(e) => handleFileChange(e, 'project')}
                        />
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
                    <Button onClick={handleGitImport} disabled={isCloning || !gitUrl.trim()} className="w-full">
                        {isCloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                        {isCloning ? 'Importing...' : 'Import Project'}
                    </Button>
                </CardContent>
            </TabsContent>
        </Tabs>
      ) : (
        <CardContent>
             <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FolderArchive className="h-6 w-6 text-primary"/>
                        <div className="flex flex-col">
                            <span className="font-semibold">Active Project</span>
                            <span className="text-sm text-muted-foreground truncate max-w-xs">{projectFile.name}</span>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={clearProjectFile}>Clear</Button>
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
      <CardContent>
        {!dataFile ? (
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
                            <span className="text-sm text-muted-foreground truncate max-w-xs">{dataFile.name}</span>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={clearDataFile}>Clear</Button>
                </div>
            </div>
        )}
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
    </div>
  );
}

const Separator = React.forwardRef<
  React.ElementRef<'div'>,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("shrink-0 bg-border h-[1px] w-full", className)} {...props} />
));
Separator.displayName = 'Separator';

    
