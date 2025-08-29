"use client";

import { useState, useEffect } from "react";
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

const mockSuccessLog = `
==============================================================================
Smoke Tests                                                                   
==============================================================================
User Login :: Test user login with valid credentials                        | PASS |
------------------------------------------------------------------------------
User Login :: Test user login with invalid credentials                      | PASS |
------------------------------------------------------------------------------
Dashboard :: Verify dashboard loads after login                             | PASS |
------------------------------------------------------------------------------
Smoke Tests                                                                 | PASS |
3 tests, 3 passed, 0 failed
==============================================================================
Output:  /path/to/output.xml
Log:     /path/to/log.html
Report:  /path/to/report.html
`;

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

export function ExecutionPanel() {
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState("");
  const [isOrchestratorFileUploaded, setIsOrchestratorFileUploaded] =
    useState(true); // Mock state
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "running") {
      setLogs("Starting execution...\n");
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          const newProgress = prev + 5;
          setLogs((l) => l + `[${newProgress}%] Processing step...\n`);
          return newProgress;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (progress === 100) {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.3;
        if (isSuccess) {
          setStatus("success");
          setLogs(
            (l) => l + "\n--- EXECUTION COMPLETE ---\n" + mockSuccessLog
          );
          toast({
            title: "Job Completed Successfully",
            action: <CheckCircle2 className="text-green-500" />,
          });
        } else {
          setStatus("failed");
          setLogs(
            (l) => l + "\n--- EXECUTION FAILED ---\n" + mockFailureLog
          );
          toast({
            variant: "destructive",
            title: "Execution Failed",
            description: "Check logs for details.",
            action: <XCircle />,
          });
        }
      }, 1000);
    }
  }, [progress, toast]);

  const handleRun = (runType: string) => {
    if (runType === "Orchestrator" && !isOrchestratorFileUploaded) {
      toast({
        variant: "destructive",
        title: "Excel not uploaded",
        description:
          "Please upload a CSV/Excel file to execute via Orchestrator.",
        action: <AlertCircle />,
      });
      return;
    }
    setLogs("");
    setProgress(0);
    setStatus("running");
    toast({ title: `Starting ${runType} run...` });
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
              <Input id="include-tags" placeholder="e.g., smoke AND critical" />
              <Label htmlFor="exclude-tags">Exclude Tags</Label>
              <Input id="exclude-tags" placeholder="e.g., wip" />
              <Button onClick={() => handleRun("By Tag")} disabled={isRunning}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Tag
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suite">
            <div className="space-y-4">
              <Label htmlFor="suite-name">Suite Name</Label>
              <Input id="suite-name" placeholder="e.g., tests/smoke_tests.robot" />
              <Button onClick={() => handleRun("By Suite")} disabled={isRunning}>
                 {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Suite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="testcase">
            <div className="space-y-4">
              <Label htmlFor="testcase-name">Test Case Name</Label>
              <Input id="testcase-name" placeholder="e.g., 'User should be able to login'" />
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
              <Button onClick={() => handleRun("Orchestrator")} disabled={isRunning}>
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
                {status === 'failed' && <AiAnalysisDialog logs={mockFailureLog} />}
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
