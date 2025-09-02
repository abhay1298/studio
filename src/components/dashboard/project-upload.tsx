
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
  const { setDataFileName, setEditedData, setEditedHeaders } = useExecutionContext();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    setUploadError(null);
    setSelectedFileName(null);
    setDataFileName(null);

    const file = event.target.files?.[0];
    if (file) {
        setSelectedFileName(file.name);
        setDataFileName(file.name); // Set in context

        const reader = new FileReader();
        if (file.name.endsWith('.csv')) {
            reader.onload = (e) => {
                const text = e.target?.result as string;
                Papa.parse(text, {
                    header: true,
                    complete: (results) => {
                        const headers = results.meta.fields || [];
                        const data = results.data.map((row: any) => headers.map(header => row[header]));
                        setEditedHeaders(headers);
                        setEditedData(data as (string | number)[][]);
                        handleSuccess(file.name);
                    },
                    error: (error) => {
                        handleError(error.message);
                    }
                });
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx')) {
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const headers = (json[0] as string[]) || [];
                const tableData = (json.slice(1) as (string | number)[][]);
                setEditedHeaders(headers);
                setEditedData(tableData);
                handleSuccess(file.name);
            };
             reader.onerror = () => {
                handleError(reader.error?.message || 'Failed to read the file.');
            };
            reader.readAsArrayBuffer(file);
        } else {
            handleError('Unsupported file type. Please upload a .csv or .xlsx file.');
        }
    } else {
        setIsUploading(false);
    }
  };

  const handleSuccess = (fileName: string) => {
    setIsUploading(false);
    setUploadError(null);
    toast({
        title: "File Processed",
        description: `Successfully loaded ${fileName}. You can now edit it in the Data Editor page.`,
        action: <FileCheck2 className="text-green-500" />,
    });
  }

  const handleError = (message: string) => {
    setUploadError(message);
    setIsUploading(false);
    setDataFileName(null);
    setEditedData([]);
    setEditedHeaders([]);
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
        <p className="mt-4 font-semibold text-foreground">Upload your test data file</p>
        <p className="text-sm text-muted-foreground">Supports .csv and .xlsx files for the Orchestrator.</p>
        <Input 
            id="file-upload" 
            type="file" 
            className="mt-4 max-w-sm" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            disabled={isUploading}
        />
      </div>
      
      {isUploading && (
         <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Processing File...</AlertTitle>
          <AlertDescription>
            Please wait while the data is being loaded.
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
            Successfully loaded <strong>{selectedFileName}</strong>.
          </AlertDescription>
        </Alert>
      )}

    </div>
  );
}
