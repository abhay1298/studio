
"use client";

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FolderUp, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExecutionContext } from '@/contexts/execution-context';
import { cn } from '@/lib/utils';

export function ProjectUploadForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FileList | null>(null);
  const { toast } = useToast();
  const { fetchSuites, fetchTestDirectoryStatus } = useExecutionContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFolder(e.target.files);
    } else {
      setSelectedFolder(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFolder) {
      setError('Please select a project folder to upload.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    // The 'webkitRelativePath' property contains the path relative to the selected folder
    Array.from(selectedFolder).forEach(file => {
        formData.append('files', file, (file as any).webkitRelativePath);
    });

    try {
      const response = await fetch('/api/upload-project', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred during upload.');
      }

      setSuccess(`Successfully uploaded project. Active directory set to: ${result.path}`);
      if(inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedFolder(null);
      
      toast({
        title: 'Project Uploaded',
        description: 'The project is now active and ready for testing.',
        action: <CheckCircle2 className="text-green-500" />,
      });

      // Refresh UI elements that depend on the active project
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
      setIsLoading(false);
    }
  };

  // This function is to add the 'webkitdirectory' attribute to the input element
  const setInputDirectory = (input: HTMLInputElement | null) => {
    if (input) {
      input.setAttribute('directory', '');
      input.setAttribute('webkitdirectory', '');
    }
  };
  
  const folderName = selectedFolder && selectedFolder.length > 0
    ? (selectedFolder[0] as any).webkitRelativePath.split('/')[0]
    : null;


  return (
    <div className="space-y-4">
       <Alert>
         <FolderUp className="h-4 w-4"/>
         <AlertTitle>Upload Your Project Folder</AlertTitle>
         <AlertDescription>
            Click the button below to open a folder picker. Select your main Robot Framework project directory to upload it directly. No zipping required.
         </AlertDescription>
       </Alert>
       <div 
        className="relative w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-center p-4 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
       >
        <FolderUp className="h-8 w-8 text-muted-foreground mb-2"/>
        {selectedFolder ? (
            <p className="text-sm font-medium">Selected: <span className="font-bold">{folderName}</span> ({selectedFolder.length} files)</p>
        ) : (
            <p className="text-sm text-muted-foreground">Click here or drag a folder to upload</p>
        )}
         <input
            type="file"
            ref={(el) => {
                inputRef.current = el;
                setInputDirectory(el); // Apply directory attributes
            }}
            onChange={handleFileChange}
            className="hidden"
            multiple
        />
       </div>

        <Button onClick={handleUpload} disabled={isLoading || !selectedFolder} className="w-full">
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <FolderUp className="mr-2 h-4 w-4"/>}
            Upload Project Folder
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

    