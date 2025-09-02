
"use client";

import { useState } from 'react';
import * as JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, FileCheck2, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function ProjectUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        // Access the webkitRelativePath property
        const filesWithPaths = Array.from(event.target.files).map(file => {
            // Create a new object to hold file and its path
            return new File([file], file.webkitRelativePath, { type: file.type });
        });
        handleUpload(filesWithPaths);
    }
  };

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);

    const zip = new JSZip();
    for (const file of files) {
        // Use the file's name which should now be the relative path
        zip.file(file.name, file);
    }

    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const formData = new FormData();
        formData.append('file', zipBlob, 'robot-project.zip');

        const response = await fetch('/api/upload-project', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to upload project.');
        }
        
        setUploadedFiles(files);
        toast({
            title: 'Upload Successful',
            description: result.message,
        });

        // Refresh suites list after successful upload
        // This assumes a context or other state management might trigger a re-fetch
        // For now, we can manually trigger a reload or navigation
        router.refresh();


    } catch (error: any) {
        setUploadError(error.message || 'An unknown error occurred.');
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-8 text-center transition-colors hover:border-primary/50"
        onClick={() => document.getElementById('project-upload-input')?.click()}
      >
        <UploadCloud className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 font-semibold text-foreground">Click to select a project folder</p>
        <p className="text-sm text-muted-foreground">Your entire Robot Framework project will be uploaded.</p>
        <input
          id="project-upload-input"
          type="file"
          className="hidden"
          // These attributes are key for selecting a directory
          onChange={handleFileChange}
          multiple
          webkitdirectory=""
          directory=""
        />
      </div>

      {isUploading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Uploading Project</AlertTitle>
          <AlertDescription>
            Please wait while your project files are being uploaded...
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {uploadedFiles.length > 0 && !isUploading && (
        <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
          <FileCheck2 className="h-4 w-4 !text-green-500" />
          <AlertTitle>Project Successfully Uploaded</AlertTitle>
          <AlertDescription>
            {uploadedFiles.length} files from your project have been uploaded and are ready for execution.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

    