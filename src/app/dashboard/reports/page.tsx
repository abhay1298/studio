
"use client";

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
import { Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reports = [
  {
    id: 'RUN-20240523-01',
    suite: 'Regression Suite',
    status: 'Success',
    timestamp: '2024-05-23 10:30:15',
    pass: 152,
    fail: 0,
  },
  {
    id: 'RUN-20240523-02',
    suite: 'Smoke Tests',
    status: 'Failed',
    timestamp: '2024-05-23 08:12:45',
    pass: 18,
    fail: 2,
  },
  {
    id: 'RUN-20240522-01',
    suite: 'API Validations',
    status: 'Success',
    timestamp: '2024-05-22 18:45:00',
    pass: 89,
    fail: 0,
  },
  {
    id: 'RUN-20240521-01',
    suite: 'Sanity Checks',
    status: 'Success',
    timestamp: '2024-05-21 09:00:12',
    pass: 25,
    fail: 0,
  },
  {
    id: 'RUN-20240520-01',
    suite: 'Full Regression (Data-driven)',
    status: 'Failed',
    timestamp: '2024-05-20 14:22:51',
    pass: 345,
    fail: 12,
  },
];

export default function ReportsPage() {
  const { toast } = useToast();

  const handleViewReport = (reportId: string) => {
    toast({
      title: 'Opening Report',
      description: `Generating view for report ${reportId}...`,
    });
    // In a real app, you would navigate to a report details page
    // e.g., router.push(`/dashboard/reports/${reportId}`);
  };

  const handleDownloadReport = (reportId: string) => {
    toast({
      title: 'Downloading Report',
      description: `Preparing download for report ${reportId}...`,
    });
    // In a real app, you would trigger a file download here
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
                <TableHead className="text-center">Passed</TableHead>
                <TableHead className="text-center">Failed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
