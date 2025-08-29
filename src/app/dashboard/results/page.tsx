import { BarChart, PieChart, LineChart } from 'lucide-react';
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

const chartData = [
  { month: 'January', passed: 186, failed: 80 },
  { month: 'February', passed: 305, failed: 200 },
  { month: 'March', passed: 237, failed: 120 },
  { month: 'April', passed: 73, failed: 190 },
  { month: 'May', passed: 209, failed: 130 },
  { month: 'June', passed: 214, failed: 140 },
];

const chartConfig = {
  passed: {
    label: 'Passed',
    color: 'hsl(var(--chart-2))',
  },
  failed: {
    label: 'Failed',
    color: 'hsl(var(--destructive))',
  },
};

const pieChartData = [
    { browser: 'chrome', tests: 275, fill: 'hsl(var(--chart-1))' },
    { browser: 'firefox', tests: 200, fill: 'hsl(var(--chart-2))' },
    { browser: 'safari', tests: 187, fill: 'hsl(var(--chart-3))' },
    { browser: 'edge', tests: 173, fill: 'hsl(var(--chart-4))' },
    { browser: 'other', tests: 90, fill: 'hsl(var(--muted))' },
]

export default function ResultsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Results & Visualization
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Execution Trends</CardTitle>
            <CardDescription>Monthly pass/fail rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChartComponent accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                 <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="passed"
                  fill="var(--color-passed)"
                  radius={4}
                />
                <Bar
                  dataKey="failed"
                  fill="var(--color-failed)"
                  radius={4}
                />
              </BarChartComponent>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Execution by Browser</CardTitle>
            <CardDescription>Distribution of tests across browsers</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
               <PieChartComponent>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie data={pieChartData} dataKey="tests" nameKey="browser" innerRadius={60} strokeWidth={5}>
                     {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                     ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChartComponent>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Average Test Duration</CardTitle>
            <CardDescription>Trend of average test completion time</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChartComponent accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickFormatter={(value) => `${value}s`}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="passed"
                  type="monotone"
                  stroke="var(--color-passed)"
                  strokeWidth={2}
                  dot={true}
                  name="Avg. Pass Duration"
                />
                 <Line
                  dataKey="failed"
                  type="monotone"
                  stroke="var(--color-failed)"
                  strokeWidth={2}
                  dot={true}
                  name="Avg. Fail Duration"
                />
              </LineChartComponent>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
