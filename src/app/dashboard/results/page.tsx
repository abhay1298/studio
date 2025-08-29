
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
  Tooltip,
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, TrendingUp, Check, X } from 'lucide-react';
import Link from 'next/link';
import { format, subMonths, startOfMonth } from 'date-fns';

type RunHistory = {
  suite: string;
  status: 'Success' | 'Failed';
  duration: string;
  date: string;
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
  const [passFailData, setPassFailData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [executionTrendData, setExecutionTrendData] = useState([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem('robotMaestroRuns');
      if (history) {
        const runs: RunHistory[] = JSON.parse(history);
        if (runs.length > 0) {
            setHasData(true);
            
            // 1. Process for Pass/Fail Pie Chart
            const passedCount = runs.filter(r => r.status === 'Success').length;
            const failedCount = runs.filter(r => r.status === 'Failed').length;
            setPassFailData([
              { name: 'Passed', value: passedCount, fill: 'hsl(var(--chart-2))'},
              { name: 'Failed', value: failedCount, fill: 'hsl(var(--destructive))' },
            ]);

            // 2. Process for Monthly Bar Chart
            const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
            const monthlyCounts: { [key: string]: { passed: number, failed: number } } = {};

            runs.forEach(run => {
              const runDate = new Date(run.date);
              if (runDate >= sixMonthsAgo) {
                const month = format(runDate, 'MMM yyyy');
                if (!monthlyCounts[month]) {
                  monthlyCounts[month] = { passed: 0, failed: 0 };
                }
                if (run.status === 'Success') {
                  monthlyCounts[month].passed++;
                } else {
                  monthlyCounts[month].failed++;
                }
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
        }
      }
    }
  }, []);

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
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Results & Visualization
      </h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Overall Pass/Fail Rate</CardTitle>
            <CardDescription>All-time execution status distribution</CardDescription>
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
                    <Cell key={`cell-${index}`} fill={entry.fill} />
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
            <CardDescription>Pass vs. Fail over the last 6 months</CardDescription>
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
                 <Bar dataKey="passed" fill="var(--color-passed)" radius={4} />
                 <Bar dataKey="failed" fill="var(--color-failed)" radius={4} />
               </BarChartComponent>
             </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Execution Volume Trend</CardTitle>
            <CardDescription>Total tests run per month</CardDescription>
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
                    <Tooltip
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
