
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FolderUp, Loader2, XCircle, CheckCircle2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExecutionContext } from '@/contexts/execution-context';
import { cn } from '@/lib/utils';

export function ProjectUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { fetchSuites, fetchTestDirectoryStatus } = useExecutionContext();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.type === 'application/zip' || selectedFile.type === 'application/x-zip-compressed' || selectedFile.name.endsWith('.zip')) {
            setFile(selectedFile);
            setError(null);
            setSuccess(null);
        } else {
            setError('Invalid file type. Please upload a .zip file.');
            setFile(null);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-project', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      
      setSuccess(`Project '${result.project_name}' uploaded. Active test directory set to: ${result.path}`);
      setFile(null);
       if(fileInputRef.current) {
        fileInputRef.current.value = "";
       }

      toast({
        title: 'Project Uploaded',
        description: 'The project is now active and ready for testing.',
      });
      fetchSuites();
      fetchTestDirectoryStatus();

    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: e.message,
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="project-zip">Robot Framework Project Folder (.zip)</Label>
        <div className={cn("flex items-center justify-center w-full p-4 border-2 border-dashed rounded-md", file && 'border-primary')}>
            <div className="text-center">
                <UploadCloud className={cn("mx-auto h-10 w-10 text-muted-foreground", file && "text-primary")} />
                <p className="mt-2 text-sm text-muted-foreground">
                    {file ? <span className="font-semibold text-primary">{file.name}</span> : 'Drag & drop or click to select a file'}
                </p>
                <p className="text-xs text-muted-foreground">Must be a single .zip file</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={triggerFileSelect} disabled={isUploading}>
                    <FolderUp className="mr-2 h-4 w-4" />
                    Choose Folder
                </Button>
            </div>
        </div>
        <Input 
            id="project-zip"
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
        />
      </div>

       <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full">
        {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
        <span className="ml-2">Upload and Set Project</span>
      </Button>
      
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 !text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
