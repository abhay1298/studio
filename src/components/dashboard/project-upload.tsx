"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileCheck2, FileWarning, FileX2 } from 'lucide-react';

export function ProjectUpload() {
  const { toast } = useToast();
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'project' | 'data'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedProjectTypes = ['application/zip', 'application/x-zip-compressed'];
    const allowedDataTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    let isValid = false;
    if (fileType === 'project' && allowedProjectTypes.includes(file.type)) {
      isValid = true;
      setProjectFile(file);
    } else if (fileType === 'data' && allowedDataTypes.includes(file.type)) {
      isValid = true;
      setDataFile(file);
    }

    if (isValid) {
      toast({
        title: 'File Uploaded Successfully',
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        action: <FileCheck2 className="text-green-500" />,
      });
    } else {
        if(file.size === 0){
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Project Management</CardTitle>
        <CardDescription>
          Upload your project and data files to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="project-file">Robot Framework Project (.zip)</Label>
          <div className="relative">
            <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="project-file"
              type="file"
              className="pl-10"
              accept=".zip"
              onChange={(e) => handleFileChange(e, 'project')}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="data-file">Test Data for Orchestrator (.xlsx, .csv)</Label>
          <div className="relative">
             <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="data-file"
              type="file"
              className="pl-10"
              accept=".xlsx,.csv"
              onChange={(e) => handleFileChange(e, 'data')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
