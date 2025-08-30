
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
import { Download, Eye, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type Report = {
  id: string;
  suite: string;
  status: 'Success' | 'Failed';
  timestamp: string;
  pass: number;
  fail: number;
  duration: string;
};


export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      // Ensure this runs only on the client
      if (typeof window !== 'undefined') {
        try {
          const history = localStorage.getItem('robotMaestroRuns');
          if (history) {
            const runs = JSON.parse(history);
            const formattedReports = runs.map((run: any, index: number) => ({
              id: `RUN-${new Date(run.date).getTime()}-${index}`,
              suite: run.suite,
              status: run.status,
              timestamp: new Date(run.date).toLocaleString(),
              duration: run.duration,
              pass: run.pass,
              fail: run.fail,
            })).reverse(); // Show newest first
            setReports(formattedReports);
          }
        } catch (e) {
          console.error("Failed to parse run history from localStorage", e);
          toast({
            variant: 'destructive',
            title: 'Could not load reports',
            description: 'There was an issue reading your execution history.'
          });
        }
      }
      setIsLoading(false);
    };
    
    loadReports();

    window.addEventListener('runsUpdated', loadReports);
    
    return () => {
        window.removeEventListener('runsUpdated', loadReports);
    };

  }, [toast]);

  const handleViewReport = (reportId: string) => {
    toast({
      title: 'Opening Report',
      description: `This feature is coming soon! You will be able to view detailed HTML reports here.`,
    });
  };

  const handleDownloadReport = (reportId: string) => {
    toast({
      title: 'Downloading Report',
      description: `This feature is coming soon! You will be able to download reports here.`,
    });
  };


  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Reports & Logs
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Execution History</CardTitle>
          <CardDescription>
            Browse and download detailed reports for all past test executions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Test Suite</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : reports.length > 0 ? (
                reports.map((report) => (
                    <TableRow key={report.id}>
                    <TableCell className="font-mono text-xs">
                        {report.id}
                    </TableCell>
                    <TableCell className="font-medium">{report.suite}</TableCell>
                    <TableCell>
                        <Badge
                          variant={report.status === 'Success' ? 'default' : 'destructive'}
                          className={
                              report.status === 'Success'
                              ? 'border-transparent bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                              : ''
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
                    <TableCell className="text-right">
                        <Button variant="outline" size="icon" className="mr-2" onClick={() => handleViewReport(report.id)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Report</span>
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDownloadReport(report.id)}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download Report</span>
                        </Button>
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
