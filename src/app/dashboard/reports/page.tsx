
"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, Ban, Trash2, Loader2, ServerCrash, RefreshCw, Clapperboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Report = {
  id: string;
  suite: string;
  status: 'Success' | 'Failed' | 'Stopped';
  timestamp: string;
  pass: number;
  fail: number;
  duration: string;
  reportFile: string | null;
  logFile: string | null;
  videoFile: string | null;
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    if (typeof window !== 'undefined') {
      try {
        const history = localStorage.getItem('robotMaestroRuns');
        if (history) {
          const runs = JSON.parse(history);
          const formattedReports: Report[] = runs.map((run: any, index: number) => ({
            id: run.id || `RUN-${new Date(run.date).getTime()}-${index}`, // Ensure ID exists
            suite: run.suite,
            status: run.status,
            timestamp: new Date(run.date).toLocaleString(),
            duration: run.duration,
            pass: run.pass,
            fail: run.fail,
            reportFile: run.reportFile || null,
            logFile: run.logFile || null,
            videoFile: run.videoFile || null,
          })).reverse();
          setReports(formattedReports);
        }
      } catch (e) {
        console.error("Failed to parse run history from localStorage", e);
        setError('Could not load reports from local history. Data may be corrupt.');
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReports();

    const handleStorageChange = () => {
        loadReports();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('runsUpdated', handleStorageChange);
    
    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('runsUpdated', handleStorageChange);
    };

  }, []);

  const handleViewFile = (file: string | null) => {
    if (file) {
      window.open(`/api/get-report/${file}`, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'File Not Available',
        description: 'The requested file was not generated or archived for this run.',
      });
    }
  };
  
  const handleDownloadFile = (file: string | null) => {
      if (file) {
          window.open(`/api/get-report/${file}?download=true`);
      } else {
          toast({ variant: 'destructive', title: 'File not available' });
      }
  };

  const handleDeleteRun = async (runId: string) => {
    const reportToDelete = reports.find(r => r.id === runId);
    if (!reportToDelete) return;

    // Optimistically update the UI
    const originalReports = [...reports];
    setReports(reports.filter(r => r.id !== runId));

    try {
        // Delete from localStorage
        const history = localStorage.getItem('robotMaestroRuns');
        if (history) {
            const runs = JSON.parse(history);
            // Match on ID, falling back to a unique composite key for older records without an ID
            const updatedRuns = runs.filter((run: any) => (run.id || `RUN-${new Date(run.date).getTime()}`) !== runId);
            localStorage.setItem('robotMaestroRuns', JSON.stringify(updatedRuns));
        }

        // Delete files from backend
        if (reportToDelete.reportFile) {
            await fetch(`/api/delete-report/${reportToDelete.reportFile}`, { method: 'DELETE' });
        }
        if (reportToDelete.logFile) {
            await fetch(`/api/delete-report/${reportToDelete.logFile}`, { method: 'DELETE' });
        }
         if (reportToDelete.videoFile) {
            await fetch(`/api/delete-report/${reportToDelete.videoFile}`, { method: 'DELETE' });
        }

        toast({ title: 'Run Deleted', description: 'The run and its associated artifacts have been removed.' });
        
    } catch (e) {
        console.error("Failed to delete run:", e);
        // Revert UI if deletion fails
        setReports(originalReports);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the run. Please check the backend server and try again.'
        });
    }
  };

  if (error) {
    return (
        <div className="space-y-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                Reports & Logs
            </h1>
            <Alert variant="destructive">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>Failed to Load Reports</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button variant="secondary" size="sm" onClick={loadReports} className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    Try Again
                </Button>
            </Alert>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Reports & Logs
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Execution History</CardTitle>
          <CardDescription>
            Browse, view, and download detailed HTML reports and video recordings for all past test executions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Suite / Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-center">Passed</TableHead>
                <TableHead className="text-center">Failed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({length: 5}).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-40 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : reports.length > 0 ? (
                reports.map((report) => (
                    <TableRow key={report.id}>
                    <TableCell className="font-medium max-w-xs truncate">{report.suite}</TableCell>
                    <TableCell>
                        <Badge
                          variant={report.status === 'Success' ? 'default' : report.status === 'Failed' ? 'destructive' : 'secondary'}
                          className={
                              report.status === 'Success'
                              ? 'border-transparent bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                              : report.status === 'Stopped' ? 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' : ''
                          }
                        >
                          {report.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{report.timestamp}</TableCell>
                    <TableCell>{report.duration}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-500 font-medium">
                        {report.pass}
                    </TableCell>
                    <TableCell className="text-center text-red-600 dark:text-red-500 font-medium">
                        {report.fail}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleViewFile(report.reportFile)} disabled={!report.reportFile}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Report</span>
                        </Button>
                         <Button variant="outline" size="icon" onClick={() => handleDownloadFile(report.logFile)} disabled={!report.logFile}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download Log</span>
                        </Button>
                         <Button variant="outline" size="icon" onClick={() => handleViewFile(report.videoFile)} disabled={!report.videoFile}>
                            <Clapperboard className="h-4 w-4" />
                            <span className="sr-only">View Video</span>
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Run</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will permanently delete this run history and its associated log, report, and video files. This cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRun(report.id)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Ban className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No reports found.</p>
                            <Link href="/dashboard/execution" className="text-sm font-medium text-primary hover:underline">
                                Run a test to generate a report.
                            </Link>
                        </div>
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
