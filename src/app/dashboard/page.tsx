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
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const recentRuns = [
  {
    suite: 'Regression Suite',
    status: 'Success',
    duration: '12m 34s',
    date: '2 hours ago',
  },
  {
    suite: 'Smoke Tests',
    status: 'Failed',
    duration: '2m 10s',
    date: '5 hours ago',
  },
  {
    suite: 'API Validations',
    status: 'Success',
    duration: '7m 5s',
    date: '1 day ago',
  },
  {
    suite: 'Sanity Checks',
    status: 'Success',
    duration: '1m 45s',
    date: '2 days ago',
  },
  {
    suite: 'Data-driven Tests',
    status: 'Running',
    duration: 'In progress',
    date: 'Just now',
  },
];

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Runs</CardDescription>
              <CardTitle className="font-headline text-4xl">1,256</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                +12% from last month
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pass Rate</CardDescription>
              <CardTitle className="font-headline text-4xl">92.8%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                +2.1% from last month
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Duration</CardDescription>
              <CardTitle className="font-headline text-4xl">8m 15s</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                -30s from last month
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="font-headline text-4xl">12</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                +2 new this month
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle className="font-headline">Recent Executions</CardTitle>
              <CardDescription>
                An overview of your latest test runs.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/reports">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
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
                {recentRuns.map((run, index) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="grid auto-rows-max items-start gap-4 md:gap-8">
        <ProjectUpload />
        <DependencyChecker />
      </div>
    </div>
  );
}
