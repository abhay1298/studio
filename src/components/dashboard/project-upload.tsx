
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { UploadCloud, Pencil, FileCheck2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExecutionContext } from '@/contexts/execution-context';
import { Skeleton } from '../ui/skeleton';

type ProjectUploadProps = {
  fileName: string | null;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
};

export function ProjectUpload({
  fileName,
  onFileChange,
  onClear,
}: ProjectUploadProps) {
  const router = useRouter();
  const { hasHydrated } = useExecutionContext();

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);
    if (e.target) {
      e.target.value = "";
    }
  };
  
  const handleEditClick = () => {
    router.push('/dashboard/data-editor');
  };
  
  if (!hasHydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  if (fileName) {
    return (
       <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-6 w-6 text-green-500" />
              <div className="flex flex-col">
                <span className="font-semibold">File Loaded</span>
                <span className="text-sm text-muted-foreground truncate max-w-xs">{fileName}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClear}>
              <Trash2 className="h-4 w-4 text-destructive"/>
            </Button>
          </div>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={handleEditClick}>
          <Pencil className="mr-2 h-4 w-4" />
          View & Edit Data File
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="data-file">Test Data File (.xlsx, .csv)</Label>
      <div className="flex items-center gap-2">
        <Label
          htmlFor="data-file-input"
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            buttonVariants({ variant: 'outline' })
          )}
        >
          <UploadCloud />
          <span className="font-bold">Choose file</span>
        </Label>
        <Input
          id="data-file-input"
          type="file"
          className="hidden"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
