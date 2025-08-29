
"use client";

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, UploadCloud, TriangleAlert, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CellData = string | number;
type RowData = CellData[];
type TableData = RowData[];

export function DataFileEditor() {
  const [data, setData] = useState<TableData>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fileDataUrl = sessionStorage.getItem('uploadedDataFile');
    const storedFileName = sessionStorage.getItem('uploadedDataFileName');

    if (fileDataUrl && storedFileName) {
      setFileName(storedFileName);
      const isCsv = storedFileName.endsWith('.csv');
      const isXlsx = storedFileName.endsWith('.xlsx');
      
      if (isCsv) setFileType('csv');
      if (isXlsx) setFileType('xlsx');
      
      try {
        const fetchRes = fetch(fileDataUrl);
        fetchRes.then(res => res.blob()).then(blob => {
            if (isCsv) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result;
                    Papa.parse(text as string, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (result) => {
                            setHeaders(result.meta.fields || []);
                            const aofA = result.data.map((row: any) => Object.values(row));
                            setData(aofA as TableData);
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
                        setHeaders(jsonData[0].map(String));
                        setData(jsonData.slice(1));
                    }
                };
                reader.readAsArrayBuffer(blob);
            }
        });
      } catch (e) {
          setError('Failed to load or parse the file. Please try uploading it again.');
          console.error(e);
      }
    }
  }, []);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex][colIndex] = value;
    setData(newData);
  };
  
  const handleDownload = () => {
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
    setData([...data, Array(headers.length).fill('')]);
  };

  const removeRow = (rowIndex: number) => {
    setData(data.filter((_, index) => index !== rowIndex));
  };
  
  const addColumn = () => {
    const newColumnName = `New Column ${headers.length + 1}`;
    setHeaders([...headers, newColumnName]);
    setData(data.map(row => [...row, '']));
  };

  const removeColumn = (colIndex: number) => {
    setHeaders(headers.filter((_, index) => index !== colIndex));
    setData(data.map(row => row.filter((_, index) => index !== colIndex)));
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
                Please go to the <a href="/dashboard" className="font-medium text-primary hover:underline">Dashboard</a> to upload a CSV or Excel file first.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex gap-2">
             <Button onClick={addRow} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Row
            </Button>
            <Button onClick={addColumn} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Column
            </Button>
        </div>
        <div className="w-full overflow-x-auto">
            <Table className="min-w-full">
                <TableHeader>
                <TableRow>
                    {headers.map((header, index) => (
                    <TableHead key={index} className="relative group">
                        {header}
                        <Button variant="ghost" size="icon" className="absolute top-1/2 right-0 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeColumn(index)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                    {row.map((cell, colIndex) => (
                        <TableCell key={colIndex}>
                        <Input
                            type="text"
                            value={cell}
                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                            className="w-full min-w-[150px]"
                        />
                        </TableCell>
                    ))}
                     <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRow(rowIndex)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
      <Button onClick={handleDownload} disabled={data.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        Save & Download Changes
      </Button>
    </div>
  );
}
