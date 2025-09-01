
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
import { useExecutionContext } from '@/contexts/execution-context';


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

export function DataFileEditor() {
  const { dataFileName, editedData, setEditedData, editedHeaders, setEditedHeaders } = useExecutionContext();
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { toast } = useToast();

  const validateData = useCallback((currentHeaders: string[], currentData: TableData) => {
    const newErrors: ValidationError[] = [];
    const lowerCaseHeaders = currentHeaders.map(h => String(h).toLowerCase());
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
  
  useEffect(() => {
    if (editedHeaders.length > 0 || editedData.length > 0) {
      validateData(editedHeaders, editedData);
    }
  }, [editedHeaders, editedData, validateData]);


  const updateStateAndValidate = (newHeaders: string[], newData: TableData) => {
    setEditedHeaders(newHeaders);
    setEditedData(newData);
    validateData(newHeaders, newData);
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...editedData];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    updateStateAndValidate(editedHeaders, newData);
  };
  
  const handleDownload = () => {
    if (!dataFileName) {
        toast({
            variant: "destructive",
            title: 'No File to Download',
            description: `Please upload a file first.`,
        });
        return;
    }
    const worksheetData = [editedHeaders, ...editedData];
    
    if (dataFileName.endsWith('.csv')) {
      const csv = Papa.unparse(worksheetData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `edited-${dataFileName}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (dataFileName.endsWith('.xlsx')) {
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `edited-${dataFileName}`);
    }

     toast({
        title: 'File Ready for Download',
        description: `Your edited file ${dataFileName} has been saved.`,
      });
  };

  const addRow = () => {
    const newData = [...editedData, Array(editedHeaders.length).fill('')];
    updateStateAndValidate(editedHeaders, newData);
  };

  const removeRow = (rowIndex: number) => {
    const newData = editedData.filter((_, index) => index !== rowIndex)
    updateStateAndValidate(editedHeaders, newData);
  };
  
  const addColumn = () => {
    const newColumnName = prompt("Enter new column header:", `Column ${editedHeaders.length + 1}`);
    if (newColumnName) {
        const newHeaders = [...editedHeaders, newColumnName];
        const newData = editedData.map(row => [...row, '']);
        updateStateAndValidate(newHeaders, newData);
    }
  };

  const removeColumn = (colIndex: number) => {
    const newHeaders = editedHeaders.filter((_, index) => index !== colIndex);
    const newData = editedData.map(row => row.filter((_, index) => index !== colIndex));
    updateStateAndValidate(newHeaders, newData);
  };

  const handleCleanup = () => {
    const originalRowCount = editedData.length;

    // 1. Filter out rows that are completely empty.
    const nonEmptyRows = editedData.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );

    const rowsRemoved = originalRowCount - nonEmptyRows.length;

    if (rowsRemoved === 0) {
      toast({
        title: 'No Changes Needed',
        description: 'No empty rows were found to clean up.',
      });
      return;
    }

    // 2. Update the state with only the non-empty rows. Columns are not touched.
    updateStateAndValidate(editedHeaders, nonEmptyRows);
    
    toast({
      title: 'Cleanup Complete',
      description: `Removed ${rowsRemoved} empty row(s).`,
    });
  };


  if (!dataFileName) {
    return (
        <Alert>
            <UploadCloud className="h-4 w-4" />
            <AlertTitle>No Data File Uploaded</AlertTitle>
            <AlertDescription>
                Please go to the <Link href="/dashboard/project-management" className="font-medium text-primary hover:underline">Project Management</Link> page to upload a file first.
            </AlertDescription>
        </Alert>
    );
  }

  if (!dataFileName.toLowerCase().endsWith('.csv') && !dataFileName.toLowerCase().endsWith('.xlsx')) {
     return (
        <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Invalid File Type for Editor</AlertTitle>
            <AlertDescription>
                The Data Editor only supports editing <strong>.csv</strong> and <strong>.xlsx</strong> files. The currently loaded data file is <strong>{dataFileName}</strong>.
                <br/>
                Please upload a compatible file on the <Link href="/dashboard/project-management" className="font-medium text-primary hover:underline">Project Management</Link> page.
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
                                {'type' in err ? err.message : `Row ${err.rowIndex + 1}: ${err.message} in the '${editedHeaders[err.colIndex]}' column.`}
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
            <Button onClick={handleDownload} disabled={editedData.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Save & Download Changes
            </Button>
        </div>
        <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-full">
                <TableHeader>
                <TableRow>
                    {editedHeaders.map((header, index) => (
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
                {editedData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                    {editedHeaders.map((_, colIndex) => {
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

    