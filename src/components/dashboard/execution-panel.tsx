
"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AiAnalysisDialog } from "./ai-analysis-dialog";

type ExecutionStatus = "idle" | "running" | "success" | "failed";

type ExecutionPanelProps = {
  isOrchestratorFileUploaded: boolean;
};

const mockFailureLog = `
==============================================================================
Regression Tests                                                              
==============================================================================
Payment Gateway :: Test successful transaction                            | PASS |
------------------------------------------------------------------------------
Payment Gateway :: Test transaction with expired card                     | FAIL |
Element with locator '//button[@id="submit-payment-flaky"]' not found after 5 seconds.
------------------------------------------------------------------------------
Inventory Management :: Add new item                                      | PASS |
------------------------------------------------------------------------------
Regression Tests                                                          | FAIL |
3 tests, 2 passed, 1 failed
==============================================================================
Output:  /path/to/output.xml
Log:     /path/to/log.html
Report:  /path/to/report.html
`;

export function ExecutionPanel({ isOrchestratorFileUploaded }: ExecutionPanelProps) {
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState("");
  const { toast } = useToast();
  const [runConfig, setRunConfig] = useState({
    includeTags: '',
    excludeTags: '',
    suite: '',
    testcase: '',
  });
  const [lastFailedLogs, setLastFailedLogs] = useState('');

  const handleInputChange = (field: keyof typeof runConfig, value: string) => {
    setRunConfig(prev => ({...prev, [field]: value}));
  };

  const handleRun = async (runType: string) => {
    if (runType === "Orchestrator" && !isOrchestratorFileUploaded) {
      toast({
        variant: "destructive",
        title: "Excel or CSV file not uploaded",
        description:
          "Please upload a CSV/Excel file to execute via Orchestrator.",
        action: <AlertCircle />,
      });
      return;
    }
    
    setLogs("Starting execution...\n");
    setProgress(0);
    setStatus("running");
    setLastFailedLogs('');
    toast({ title: `Starting ${runType} run...` });

    try {
      // In a real app, you'd send the files too.
      // This is simplified to send just the config.
      const response = await fetch('/api/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runType, config: runConfig }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const result = await response.json();

      setLogs(result.logs);
      setStatus(result.status);

      if (result.status === 'success') {
        toast({
          title: "Job Completed Successfully",
          action: <CheckCircle2 className="text-green-500" />,
        });
      } else if (result.status === 'failed') {
        setLastFailedLogs(result.logs);
        toast({
          variant: "destructive",
          title: "Execution Failed",
          description: "Check logs for details.",
          action: <XCircle />,
        });
      }

    } catch (error) {
      console.error("Execution failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setLogs(`Execution failed: ${errorMessage}`);
      setStatus("failed");
      toast({
        variant: "destructive",
        title: "Execution Error",
        description: "Could not connect to the execution service.",
      });
    } finally {
        setProgress(100);
    }
  };

  const isRunning = status === "running";

  return (
    <Card>
      <Tabs defaultValue="tag">
        <CardHeader>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tag">By Tag</TabsTrigger>
            <TabsTrigger value="suite">By Suite</TabsTrigger>
            <TabsTrigger value="testcase">By Test Case</TabsTrigger>
            <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent>
          <TabsContent value="tag">
            <div className="space-y-4">
              <Label htmlFor="include-tags">Include Tags</Label>
              <Input id="include-tags" placeholder="e.g., smoke AND critical" value={runConfig.includeTags} onChange={(e) => handleInputChange('includeTags', e.target.value)} />
              <Label htmlFor="exclude-tags">Exclude Tags</Label>
              <Input id="exclude-tags" placeholder="e.g., wip" value={runConfig.excludeTags} onChange={(e) => handleInputChange('excludeTags', e.target.value)}/>
              <Button onClick={() => handleRun("By Tag")} disabled={isRunning}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Tag
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suite">
            <div className="space-y-4">
              <Label htmlFor="suite-name">Suite Name</Label>
              <Input id="suite-name" placeholder="e.g., tests/smoke_tests.robot" value={runConfig.suite} onChange={(e) => handleInputChange('suite', e.target.value)} />
              <Button onClick={() => handleRun("By Suite")} disabled={isRunning}>
                 {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Suite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="testcase">
            <div className="space-y-4">
              <Label htmlFor="testcase-name">Test Case Name</Label>
              <Input id="testcase-name" placeholder="e.g., 'User should be able to login'" value={runConfig.testcase} onChange={(e) => handleInputChange('testcase', e.target.value)} />
              <Button onClick={() => handleRun("By Test Case")} disabled={isRunning}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Test
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="orchestrator">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Orchestrator Mode</AlertTitle>
                <AlertDescription>
                  This mode will execute tests based on the uploaded Excel/CSV file. Ensure the file is uploaded and validated.
                </AlertDescription>
              </Alert>
              <Button onClick={() => handleRun("Orchestrator")} disabled={isRunning || !isOrchestratorFileUploaded}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run via Orchestrator
              </Button>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      {(status !== "idle") && (
        <>
          <CardHeader>
            <CardTitle className="font-headline">Execution Logs</CardTitle>
            <CardDescription>Live logs from the test execution.</CardDescription>
          </CardHeader>
          <CardContent>
            {isRunning && <Progress value={progress} className="w-full mb-4" />}
            <ScrollArea className="h-72 w-full rounded-md border bg-muted p-4">
              <pre className="text-sm font-code whitespace-pre-wrap">{logs}</pre>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center gap-2">
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {status === "failed" && <XCircle className="h-5 w-5 text-destructive" />}
              <span className="text-sm font-medium">
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div className="flex gap-2">
                {status === 'failed' && <AiAnalysisDialog logs={lastFailedLogs} />}
                <Button variant="outline" disabled={status === "running"}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Logs
                </Button>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
