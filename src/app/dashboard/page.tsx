
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
import { ArrowUpRight, Ban } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutionContext } from '@/contexts/execution-context';

type RecentRun = {
  suite: string;
  status: 'Success' | 'Failed';
  duration: string;
  date: string;
};

export default function DashboardPage() {
  const { projectFileName, hasHydrated } = useExecutionContext();
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalRuns: 0,
    passRate: 'N/A',
    avgDuration: '--',
  });
  
  const loadRunHistory = () => {
    const loadData = async () => {
        setIsLoading(true);
        if (typeof window !== 'undefined') {
          try {
            const history = await localStorage.getItem('robotMaestroRuns');
            if (history) {
              const runs = JSON.parse(history);
              if (runs.length > 0) {
                const latestRuns = runs.slice(-5).reverse();
                setRecentRuns(latestRuns);
                
                const totalRuns = runs.length;
                const passedRuns = runs.filter((r: any) => r.status === 'Success').length;
                const passRate = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) + '%' : 'N/A';
      
                const totalDuration = runs.reduce((acc: number, r: any) => {
                    const durationValue = r.duration ? parseFloat(r.duration) : 0;
                    return acc + (isNaN(durationValue) ? 0 : durationValue);
                }, 0);
                const avgDuration = totalRuns > 0 ? (totalDuration / totalRuns).toFixed(2) + 's' : '--';
      
                setStats(prev => ({ ...prev, totalRuns, passRate, avgDuration }));
              } else {
                 setStats(prev => ({ ...prev, totalRuns: 0, passRate: 'N/A', avgDuration: '--' }));
                 setRecentRuns([]);
              }
            } else {
              setStats(prev => ({ ...prev, totalRuns: 0, passRate: 'N/A', avgDuration: '--' }));
              setRecentRuns([]);
            }
          } catch (e) {
            console.error("Failed to parse run history from localStorage", e);
            setStats(prev => ({ ...prev, totalRuns: 0, passRate: 'N-A', avgDuration: '--' }));
            setRecentRuns([]);
          }
        }
        setIsLoading(false);
    }
    loadData();
  };

  useEffect(() => {
    loadRunHistory();
    window.addEventListener('runsUpdated', loadRunHistory);
    
    return () => {
      window.removeEventListener('runsUpdated', loadRunHistory);
    };
  }, []);

  return (
    <div className="grid gap-4 md:gap-8">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Runs</CardDescription>
              <CardTitle className="font-headline text-4xl">{isLoading ? <Skeleton className="w-20 h-9"/> : stats.totalRuns}</CardTitle>
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
              <CardTitle className="font-headline text-4xl">{isLoading ? <Skeleton className="w-24 h-9"/> : stats.passRate}</CardTitle>
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
              <CardTitle className="font-headline text-4xl">{isLoading ? <Skeleton className="w-20 h-9"/> : stats.avgDuration}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Average across all runs
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Project</CardDescription>
               <CardTitle className="font-headline text-3xl truncate" title={!hasHydrated ? 'Loading...' : (projectFileName || 'Not Configured')}>
                 {!hasHydrated ? <Skeleton className="w-40 h-8" /> : (projectFileName || 'Not Configured')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                 <Link href="/dashboard/project-explorer" className="hover:underline">
                    View project files &rarr;
                 </Link>
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
                {isLoading ? (
                  Array.from({length: 3}).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : recentRuns.length > 0 ? (
                    recentRuns.map((run, index) => (
                    <TableRow key={index}>
                        <TableCell>
                        <div className="font-medium">{run.suite}</div>
                        </TableCell>
                        <TableCell>
                        <Badge
                             variant={run.status === 'Success' ? 'default' : 'destructive'}
                             className={
                                run.status === 'Success'
                                 ? 'border-transparent bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                 : ''
                             }
                        >
                            {run.status}
                        </Badge>
                        </TableCell>
                        <TableCell>{run.duration}</TableCell>
                        <TableCell>{new Date(run.date).toLocaleString()}</TableCell>
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
  );
}
