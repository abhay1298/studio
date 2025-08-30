
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart as BarChartComponent,
  Line,
  LineChart as LineChartComponent,
  Pie,
  PieChart as PieChartComponent,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, Check, X } from 'lucide-react';
import Link from 'next/link';
import { format, subMonths, startOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RunHistory = {
  id: string;
  suite: string;
  status: 'Success' | 'Failed' | 'Stopped';
  duration: string;
  date: string;
  pass: number;
  fail: number;
};

const PIE_COLORS = ['hsl(var(--chart-2))', 'hsl(var(--destructive))'];

const chartConfig = {
  passed: {
    label: 'Passed',
    color: 'hsl(var(--chart-2))',
    icon: Check,
  },
  failed: {
    label: 'Failed',
    color: 'hsl(var(--destructive))',
    icon: X,
  },
};

export default function ResultsPage() {
  const [allRuns, setAllRuns] = useState<RunHistory[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('overall');
  
  const [passFailData, setPassFailData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [executionTrendData, setExecutionTrendData] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  // Load all data from localStorage initially
  useEffect(() => {
    const loadInitialData = () => {
      setIsLoading(true);
       if (typeof window !== 'undefined') {
        const history = localStorage.getItem('robotMaestroRuns');
        if (history) {
            const runs: RunHistory[] = JSON.parse(history);
            if (runs.length > 0) {
              setAllRuns(runs.map(run => ({
                id: run.id || `RUN-${new Date(run.date).getTime()}`,
                ...run
              })).reverse());
              setHasData(true);
            } else {
              setHasData(false);
            }
        }
       }
       setIsLoading(false);
    };

    loadInitialData();
    window.addEventListener('runsUpdated', loadInitialData);
    return () => {
      window.removeEventListener('runsUpdated', loadInitialData);
    };
  }, []);

  // Process data whenever the selected run or the base data changes
  useEffect(() => {
    if (!hasData) return;

    const runsToProcess = selectedRunId === 'overall' 
        ? allRuns 
        : allRuns.filter(r => r.id === selectedRunId);

    if (runsToProcess.length === 0) return;

    // 1. Process for Pass/Fail Pie Chart
    const passedCount = runsToProcess.reduce((acc, run) => acc + run.pass, 0);
    const failedCount = runsToProcess.reduce((acc, run) => acc + run.fail, 0);
    setPassFailData([
      { name: 'Passed', value: passedCount, fill: 'hsl(var(--chart-2))'},
      { name: 'Failed', value: failedCount, fill: 'hsl(var(--destructive))' },
    ]);

    // 2. Process for Monthly Bar Chart
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
    const monthlyCounts: { [key: string]: { passed: number, failed: number } } = {};

    runsToProcess.forEach(run => {
      const runDate = new Date(run.date);
      if (runDate >= sixMonthsAgo) {
        const month = format(runDate, 'MMM yyyy');
        if (!monthlyCounts[month]) {
          monthlyCounts[month] = { passed: 0, failed: 0 };
        }
        monthlyCounts[month].passed += run.pass;
        monthlyCounts[month].failed += run.fail;
      }
    });

    // Ensure all last 6 months are present
    for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'MMM yyyy');
        if (!monthlyCounts[monthKey]) {
            monthlyCounts[monthKey] = { passed: 0, failed: 0 };
        }
    }

    const sortedMonthlyData = Object.entries(monthlyCounts)
        .map(([month, counts]) => ({ month, ...counts }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    setMonthlyData(sortedMonthlyData);

    // 3. Process for Execution Trend Line Chart
    setExecutionTrendData(
        sortedMonthlyData.map(d => ({
            month: d.month,
            executions: d.passed + d.failed,
        }))
    );
  }, [selectedRunId, allRuns, hasData]);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Results & Visualization
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[250px]">
                    <Skeleton className="h-[200px] w-[200px] rounded-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="h-[250px]">
                    <Skeleton className="h-full w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="h-[250px]">
                    <Skeleton className="h-full w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    )
  }

  if (!hasData) {
     return (
        <div className="space-y-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                Results & Visualization
            </h1>
            <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>No Visualization Data Yet</AlertTitle>
                <AlertDescription>
                    Run some tests from the <Link href="/dashboard/execution" className="font-medium text-primary hover:underline">Execution</Link> page to start generating data for these charts.
                </AlertDescription>
            </Alert>
        </div>
     )
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                Results & Visualization
            </h1>
            <div className="w-full sm:w-auto min-w-[300px]">
                <Select value={selectedRunId} onValueChange={setSelectedRunId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a run to visualize..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="overall">Overall Results</SelectItem>
                        {allRuns.map(run => (
                            <SelectItem key={run.id} value={run.id} className="max-w-[400px]">
                                <span className="truncate">{`[${new Date(run.date).toLocaleDateString()}] ${run.suite}`}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Pass/Fail Rate</CardTitle>
            <CardDescription>{selectedRunId === 'overall' ? 'All-time execution status' : 'Status for the selected execution'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
              <PieChartComponent>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={passFailData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                   {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                />
              </PieChartComponent>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Monthly Execution Trends</CardTitle>
            <CardDescription>{selectedRunId === 'overall' ? 'Pass vs. Fail over the last 6 months' : 'Execution results for the selected month'}</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
               <BarChartComponent accessibilityLayer data={monthlyData}>
                 <CartesianGrid vertical={false} />
                 <XAxis
                   dataKey="month"
                   tickLine={false}
                   tickMargin={10}
                   axisLine={false}
                   tickFormatter={(value) => value.slice(0, 3)}
                 />
                 <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                 />
                 <ChartLegend content={<ChartLegendContent />} />
                 <Bar dataKey="passed" fill="var(--color-passed)" radius={4} stackId="a"/>
                 <Bar dataKey="failed" fill="var(--color-failed)" radius={4} stackId="a"/>
               </BarChartComponent>
             </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Execution Volume Trend</CardTitle>
            <CardDescription>{selectedRunId === 'overall' ? 'Total tests run per month' : 'Tests run in the selected month'}</CardDescription>
          </CardHeader>
          <CardContent>
              <ChartContainer config={{
                executions: { label: 'Executions', color: 'hsl(var(--primary))' }
              }} className="h-[250px] w-full">
                <LineChartComponent
                    accessibilityLayer
                    data={executionTrendData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        allowDecimals={false}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                indicator="dot"
                                labelKey='executions'
                                nameKey="month"
                            />
                        }
                    />
                    <Line
                        dataKey="executions"
                        type="monotone"
                        stroke="var(--color-executions)"
                        strokeWidth={2}
                        dot={true}
                    />
                </LineChartComponent>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
