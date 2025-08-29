
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
import { ProjectUpload } from '@/components/dashboard/project-upload';
import { DependencyChecker } from '@/components/dashboard/dependency-checker';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Ban } from 'lucide-react';
import Link from 'next/link';

type RecentRun = {
  suite: string;
  status: 'Success' | 'Failed' | 'Running';
  duration: string;
  date: string;
};

export default function DashboardPage() {
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [stats, setStats] = useState({
    totalRuns: 0,
    passRate: '0.0%',
  });

  useEffect(() => {
    // This function will now run on the client-side after the component mounts.
    const loadRunHistory = () => {
      if (typeof window !== 'undefined') {
        const history = localStorage.getItem('robotMaestroRuns');
        if (history) {
          const runs: RecentRun[] = JSON.parse(history);
          const latestRuns = runs.slice(-5).reverse(); // Get last 5 and reverse to show newest first
          setRecentRuns(latestRuns);
          
          // Calculate stats
          const totalRuns = runs.length;
          const passedRuns = runs.filter(r => r.status === 'Success').length;
          const passRate = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) + '%' : '0.0%';
          setStats({ totalRuns, passRate });
        }
      }
    };
    loadRunHistory();
    
    // Listen for custom event to update runs in real-time
    window.addEventListener('runsUpdated', loadRunHistory);
    
    // Clean up the event listener
    return () => {
        window.removeEventListener('runsUpdated', loadRunHistory);
    };

  }, []);

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Runs</CardDescription>
              <CardTitle className="font-headline text-4xl">{stats.totalRuns}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                All-time execution count
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pass Rate</CardDescription>
              <CardTitle className="font-headline text-4xl">{stats.passRate}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Based on all-time runs
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Duration</CardDescription>
              <CardTitle className="font-headline text-4xl">--</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Calculation coming soon
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="font-headline text-4xl">{projectFile ? 1 : 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Currently loaded project
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle className="font-headline">Recent Executions</CardTitle>
              <CardDescription>
                Your latest test runs will appear here.
              </CardDescription>
            </div>
            <Link href="/dashboard/reports" passHref>
              <Button asChild size="sm" className="ml-auto gap-1">
                <span>
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Suite</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.length > 0 ? (
                    recentRuns.map((run, index) => (
                    <TableRow key={index}>
                        <TableCell>
                        <div className="font-medium">{run.suite}</div>
                        </TableCell>
                        <TableCell>
                        <Badge
                            variant={
                            run.status === 'Success'
                                ? 'default'
                                : run.status === 'Failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className={`${
                            run.status === 'Success' &&
                            'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/20'
                            } ${
                            run.status === 'Running' && 'animate-pulse'
                            }`}
                        >
                            {run.status}
                        </Badge>
                        </TableCell>
                        <TableCell>{run.duration}</TableCell>
                        <TableCell>{run.date}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <Ban className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">No executions found.</p>
                                <Link href="/dashboard/execution" className="text-sm font-medium text-primary hover:underline">
                                    Run a test to get started.
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
      <div className="grid auto-rows-max items-start gap-4 md:gap-8">
        <ProjectUpload onProjectFileChange={setProjectFile} />
        <DependencyChecker projectFile={projectFile} />
      </div>
    </div>
  );
}
