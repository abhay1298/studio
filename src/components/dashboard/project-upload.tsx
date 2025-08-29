
"use client";

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
import { UploadCloud, FileCheck2, FileWarning, FileX2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProjectUploadProps = {
  onDataFileChange: (isUploaded: boolean) => void;
  onProjectFileChange: (isUploaded: boolean) => void;
};

export function ProjectUpload({ onDataFileChange, onProjectFileChange }: ProjectUploadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'project' | 'data'
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (fileType === 'project') {
        onProjectFileChange(false);
        setProjectFile(null);
      }
      if (fileType === 'data') {
        onDataFileChange(false);
        setDataFile(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('uploadedDataFile');
          sessionStorage.removeItem('uploadedDataFileName');
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
        onProjectFileChange(true);
      } else {
        onProjectFileChange(false);
        setProjectFile(null);
      }
    } else if (fileType === 'data') {
      if (allowedDataTypes.includes(file.type)) {
        isValid = true;
        setDataFile(file);
        onDataFileChange(true);
        // Store the file in session storage to pass to the editor page
        const reader = new FileReader();
        reader.onload = function(event) {
          if (typeof window !== 'undefined' && event.target?.result) {
            sessionStorage.setItem('uploadedDataFile', event.target.result as string);
            sessionStorage.setItem('uploadedDataFileName', file.name);
          }
        };
        reader.readAsDataURL(file);
      } else {
        onDataFileChange(false);
        setDataFile(null);
         if (typeof window !== 'undefined') {
          sessionStorage.removeItem('uploadedDataFile');
          sessionStorage.removeItem('uploadedDataFileName');
        }
      }
    }

    if (isValid) {
      toast({
        title: 'File Uploaded Successfully',
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Project Management</CardTitle>
        <CardDescription>
          Upload your project and data files to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
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
        <div className="grid gap-2">
          <Label htmlFor="data-file">Test Data for Orchestrator (.xlsx, .csv)</Label>
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
