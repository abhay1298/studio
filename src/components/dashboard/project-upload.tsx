
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, FileCheck2, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExecutionContext } from '@/contexts/execution-context';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';


export function ProjectUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const { setDataFileName, setEditedData, setEditedHeaders, fetchSuites, fetchTestDirectoryStatus } = useExecutionContext();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    setUploadError(null);
    setSelectedFileName(null);
    setDataFileName(null);

    const file = event.target.files?.[0];
    if (file) {
        setSelectedFileName(file.name);

        if (file.name.endsWith('.zip')) {
            handleProjectUpload(file);
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
            handleDataFileUpload(file);
        } else {
            handleError('Unsupported file type. Please upload a .zip for projects, or .csv/.xlsx for data.');
        }
    } else {
        setIsUploading(false);
    }
  };

  const handleProjectUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload-project', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to upload project.');
        }

        handleSuccess(file.name, `Project "${result.project_name}" uploaded and set as active directory.`);
        fetchSuites(); // Refresh the project explorer
        fetchTestDirectoryStatus(); // Refresh the active directory display
    } catch (e: any) {
        handleError(e.message || 'An unknown error occurred during project upload.');
    }
  };

  const handleDataFileUpload = (file: File) => {
    setDataFileName(file.name); // Set in context
    const reader = new FileReader();
    if (file.name.endsWith('.csv')) {
        reader.onload = (e) => {
            const text = e.target?.result as string;
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    const data = results.data.map((row: any) => headers.map(header => row[header] ?? ''));
                    setEditedHeaders(headers);
                    setEditedData(data as (string | number)[][]);
                    handleSuccess(file.name, `Data file loaded. You can now edit it in the Data Editor page.`);
                },
                error: (error) => {
                    handleError(error.message);
                }
            });
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                const headers = (json[0] as string[]) || [];
                const tableData = (json.slice(1) as (string | number)[][]);
                setEditedHeaders(headers);
                setEditedData(tableData);
                handleSuccess(file.name, `Data file loaded. You can now edit it in the Data Editor page.`);
            } catch (xlsxError: any) {
                handleError(xlsxError.message || "Failed to parse the XLSX file.");
            }
        };
         reader.onerror = () => {
            handleError(reader.error?.message || 'Failed to read the file.');
        };
        reader.readAsArrayBuffer(file);
    }
  }


  const handleSuccess = (fileName: string, description: string) => {
    setIsUploading(false);
    setUploadError(null);
    toast({
        title: "File Processed",
        description,
        action: <FileCheck2 className="text-green-500" />,
    });
  }

  const handleError = (message: string) => {
    setUploadError(message);
    setIsUploading(false);
    // Do not clear data file name in case of project upload error
    // setDataFileName(null); 
    toast({
        variant: "destructive",
        title: "Upload Failed",
        description: message,
    });
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-8 text-center">
        <UploadCloud className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 font-semibold text-foreground">Upload your files</p>
        <p className="text-sm text-muted-foreground">.zip for projects, .csv/.xlsx for data.</p>
        <Input 
            id="file-upload" 
            type="file" 
            className="mt-4 max-w-sm" 
            accept=".zip,.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            disabled={isUploading}
        />
      </div>
      
      {isUploading && (
         <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Processing File...</AlertTitle>
          <AlertDescription>
            Please wait while the file is being uploaded and processed.
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

       {selectedFileName && !isUploading && !uploadError && (
        <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
          <FileCheck2 className="h-4 w-4 !text-green-500" />
          <AlertTitle>File Ready</AlertTitle>
          <AlertDescription>
            Successfully processed <strong>{selectedFileName}</strong>.
          </AlertDescription>
        </Alert>
      )}

    </div>
  );
}
