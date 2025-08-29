
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const history = localStorage.getItem('robotMaestroRuns');
        if (history) {
          const runs = JSON.parse(history);
          // The history is just the basic run info, we'll format it for the report view
          const formattedReports = runs.map((run: any, index: number) => ({
            id: `RUN-${new Date(run.date).getTime()}-${index}`, // Create a more unique ID
            suite: run.suite,
            status: run.status,
            timestamp: new Date(run.date).toLocaleString(),
            duration: run.duration,
            // These are hardcoded for now as we don't get this from the API yet
            pass: run.status === 'Success' ? Math.floor(Math.random() * 50) + 1 : Math.floor(Math.random() * 50),
            fail: run.status === 'Success' ? 0 : Math.floor(Math.random() * 5) + 1,
          })).reverse(); // Show newest first
          setReports(formattedReports);
        }
    }
  }, []);

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
              {reports.length > 0 ? (
                reports.map((report) => (
                    <TableRow key={report.id}>
                    <TableCell className="font-mono text-xs">
                        {report.id}
                    </TableCell>
                    <TableCell className="font-medium">{report.suite}</TableCell>
                    <TableCell>
                        <Badge
                        variant={
                            report.status === 'Success' ? 'default' : 'destructive'
                        }
                        className={
                            report.status === 'Success'
                            ? 'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/20'
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
