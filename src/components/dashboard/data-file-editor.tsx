
"use client";

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, UploadCloud, TriangleAlert, Plus, Trash2, AlertCircle, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import Link from 'next/link';


type CellData = string | number;
type RowData = CellData[];
type TableData = RowData[];
type ValidationError = {
    rowIndex: number;
    colIndex: number;
    message: string;
} | {
    type: 'header';
    message: string;
};

const SESSION_HEADERS_KEY = 'editedDataHeaders';
const SESSION_DATA_KEY = 'editedDataRows';

// Helper to save current state to session storage
const saveDataToSession = (headers: string[], data: TableData) => {
    try {
        sessionStorage.setItem(SESSION_HEADERS_KEY, JSON.stringify(headers));
        sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save data to session storage", e);
    }
};

// Helper to load state from session storage
const loadDataFromSession = (): { headers: string[], data: TableData } | null => {
    try {
        const storedHeaders = sessionStorage.getItem(SESSION_HEADERS_KEY);
        const storedData = sessionStorage.getItem(SESSION_DATA_KEY);
        if (storedHeaders && storedData) {
            return {
                headers: JSON.parse(storedHeaders),
                data: JSON.parse(storedData),
            };
        }
        return null;
    } catch (e) {
        console.error("Failed to load data from session storage", e);
        return null;
    }
};


export function DataFileEditor() {
  const [data, setData] = useState<TableData>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { toast } = useToast();

  const validateData = useCallback((currentHeaders: string[], currentData: TableData) => {
    const newErrors: ValidationError[] = [];
    const lowerCaseHeaders = currentHeaders.map(h => h.toLowerCase());
    const idIndex = lowerCaseHeaders.indexOf('id');
    const priorityIndex = lowerCaseHeaders.indexOf('priority');

    if (idIndex === -1) {
        newErrors.push({ type: 'header', message: "Missing required column: 'id'." });
    }
    if (priorityIndex === -1) {
        newErrors.push({ type: 'header', message: "Missing required column: 'priority'." });
    }

    if (newErrors.length > 0) {
        setValidationErrors(newErrors);
        return; // Don't check row data if headers are missing
    }

    currentData.forEach((row, rowIndex) => {
        if (!row[idIndex]) {
            newErrors.push({ rowIndex, colIndex: idIndex, message: "ID is missing" });
        }
        if (!row[priorityIndex]) {
            newErrors.push({ rowIndex, colIndex: priorityIndex, message: "Priority is missing" });
        }
    });

    setValidationErrors(newErrors);
  }, []);

  const updateStateAndSession = (newHeaders: string[], newData: TableData) => {
    setHeaders(newHeaders);
    setData(newData);
    validateData(newHeaders, newData);
    saveDataToSession(newHeaders, newData);
  }

  useEffect(() => {
    try {
      // First, try to load from our edited session data
      const sessionData = loadDataFromSession();
      if (sessionData) {
          setFileName(sessionStorage.getItem('uploadedDataFileName') || '');
          const fileExtension = sessionStorage.getItem('uploadedDataFileName')?.split('.').pop();
          if (fileExtension === 'csv') setFileType('csv');
          if (fileExtension === 'xlsx') setFileType('xlsx');
          
          setHeaders(sessionData.headers);
          setData(sessionData.data);
          validateData(sessionData.headers, sessionData.data);
          return;
      }
      
      // If not, fall back to loading the original file
      const fileDataUrl = sessionStorage.getItem('uploadedDataFile');
      const storedFileName = sessionStorage.getItem('uploadedDataFileName');
  
      if (fileDataUrl && storedFileName) {
        setFileName(storedFileName);
        const isCsv = storedFileName.endsWith('.csv');
        const isXlsx = storedFileName.endsWith('.xlsx');
        
        if (isCsv) setFileType('csv');
        if (isXlsx) setFileType('xlsx');
        
        fetch(fileDataUrl)
          .then(res => res.blob())
          .then(blob => {
              const processData = (parsedHeaders: string[], parsedData: TableData) => {
                updateStateAndSession(parsedHeaders, parsedData);
              }
              if (isCsv) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      const text = e.target?.result;
                      Papa.parse(text as string, {
                          header: true,
                          skipEmptyLines: true,
                          complete: (result) => {
                              const parsedHeaders = result.meta.fields || [];
                              const parsedData = result.data.map((row: any) => Object.values(row)) as TableData;
                              processData(parsedHeaders, parsedData);
                          }
                      });
                  };
                  reader.readAsText(blob);
              } else if (isXlsx) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      const arrayBuffer = e.target?.result;
                      const wb = XLSX.read(arrayBuffer, { type: 'array' });
                      const wsname = wb.SheetNames[0];
                      const ws = wb.Sheets[wsname];
                      const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
                      if (jsonData.length > 0) {
                          const parsedHeaders = jsonData[0].map(String);
                          const parsedData = jsonData.slice(1);
                          processData(parsedHeaders, parsedData);
                      }
                  };
                  reader.readAsArrayBuffer(blob);
              }
          }).catch(e => {
            setError('Failed to load the file blob. Please try uploading it again.');
            console.error(e);
          });
      }
    } catch (e) {
        setError('Failed to parse the file from session storage. Please try uploading it again.');
        console.error(e);
    }
  }, [validateData]);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    updateStateAndSession(headers, newData);
  };
  
  const handleDownload = () => {
    if (!fileName) {
        toast({
            variant: "destructive",
            title: 'No File to Download',
            description: `Please upload a file first.`,
        });
        return;
    }
    const worksheetData = [headers, ...data];
    
    if (fileType === 'csv') {
      const csv = Papa.unparse(worksheetData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `edited-${fileName}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (fileType === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `edited-${fileName}`);
    }

     toast({
        title: 'File Ready for Download',
        description: `Your edited file ${fileName} has been saved.`,
      });
  };

  const addRow = () => {
    const newData = [...data, Array(headers.length).fill('')];
    updateStateAndSession(headers, newData);
  };

  const removeRow = (rowIndex: number) => {
    const newData = data.filter((_, index) => index !== rowIndex)
    updateStateAndSession(headers, newData);
  };
  
  const addColumn = () => {
    const newColumnName = prompt("Enter new column header:", `Column ${headers.length + 1}`);
    if (newColumnName) {
        const newHeaders = [...headers, newColumnName];
        const newData = data.map(row => [...row, '']);
        updateStateAndSession(newHeaders, newData);
    }
  };

  const removeColumn = (colIndex: number) => {
    const newHeaders = headers.filter((_, index) => index !== colIndex);
    const newData = data.map(row => row.filter((_, index) => index !== colIndex));
    updateStateAndSession(newHeaders, newData);
  };

  const handleCleanup = () => {
    const originalRowCount = data.length;
    const originalColCount = headers.length;

    // Remove empty rows
    const nonEmptyRows = data.filter(row => row.some(cell => String(cell).trim() !== ''));
    
    // Find empty columns
    const emptyColIndexes: Set<number> = new Set();
    if (nonEmptyRows.length > 0) {
        for (let i = 0; i < headers.length; i++) {
            const isColumnEmpty = nonEmptyRows.every(row => !row[i] || String(row[i]).trim() === '');
            const isHeaderEmpty = !headers[i] || headers[i].trim() === '';
            if (isColumnEmpty && isHeaderEmpty) {
                emptyColIndexes.add(i);
            }
        }
    }
    
    // Filter headers and data based on empty columns
    const newHeaders = headers.filter((_, index) => !emptyColIndexes.has(index));
    const newData = nonEmptyRows.map(row => row.filter((_, index) => !emptyColIndexes.has(index)));
    
    const rowsRemoved = originalRowCount - newData.length;
    const colsRemoved = originalColCount - newHeaders.length;

    if (rowsRemoved > 0 || colsRemoved > 0) {
      updateStateAndSession(newHeaders, newData);
      toast({
        title: 'Cleanup Complete',
        description: `Removed ${rowsRemoved} empty row(s) and ${colsRemoved} empty column(s).`,
      });
    } else {
      toast({
        title: 'No Changes Needed',
        description: 'No empty rows or columns were found to clean up.',
      });
    }
  };

  if (error) {
    return (
        <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    )
  }

  if (!fileName) {
    return (
        <Alert>
            <UploadCloud className="h-4 w-4" />
            <AlertTitle>No Data File Uploaded</AlertTitle>
            <AlertDescription>
                Please go to the <Link href="/dashboard/project-explorer" className="font-medium text-primary hover:underline">Project Management</Link> page to upload a file first.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-4">
        {validationErrors.length > 0 && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Issues Detected</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5">
                        {validationErrors.map((err, i) => (
                            <li key={i}>
                                {'type' in err ? err.message : `Row ${err.rowIndex + 1}: ${err.message} in the '${headers[err.colIndex]}' column.`}
                            </li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        )}
        <div className="flex flex-wrap gap-2">
             <Button onClick={addRow} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Row
            </Button>
            <Button onClick={addColumn} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Column
            </Button>
             <Button onClick={handleCleanup} variant="outline">
                <Wand2 className="mr-2 h-4 w-4" />
                Clean Up Data
            </Button>
            <div className="flex-grow"></div>
            <Button onClick={handleDownload} disabled={data.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Save & Download Changes
            </Button>
        </div>
        <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-full">
                <TableHeader>
                <TableRow>
                    {headers.map((header, index) => (
                    <TableHead key={index} className="relative group whitespace-nowrap">
                        {header}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="absolute top-1/2 right-0 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100">
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action will permanently delete the entire "{header}" column and all its data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeColumn(index)}>Delete Column</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                    </TableHead>
                    ))}
                    <TableHead className="w-[50px]">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                    {headers.map((_, colIndex) => {
                        const isInvalid = validationErrors.some(err => 'rowIndex' in err && err.rowIndex === rowIndex && err.colIndex === colIndex);
                        return (
                            <TableCell key={colIndex}>
                                <Input
                                    type="text"
                                    value={row[colIndex] || ''}
                                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                    className={cn(
                                        "w-full min-w-[150px]",
                                        isInvalid && "border-destructive ring-2 ring-destructive/50 focus-visible:ring-destructive"
                                    )}
                                />
                            </TableCell>
                        )
                    })}
                     <TableCell className="text-right">
                        <AlertDialog>
                           <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Row?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete this row. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeRow(rowIndex)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                           </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    </div>
  );
}
