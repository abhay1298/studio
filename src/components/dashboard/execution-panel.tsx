
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  XCircle,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AiAnalysisDialog } from "./ai-analysis-dialog";

type ExecutionStatus = "idle" | "running" | "success" | "failed";

export function ExecutionPanel() {
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();
  const [runConfig, setRunConfig] = useState({
    includeTags: '',
    excludeTags: '',
    suite: '',
    testcase: '',
  });
  const [lastFailedLogs, setLastFailedLogs] = useState('');
  const [isDataFileUploaded, setIsDataFileUploaded] = useState(false);

  useEffect(() => {
    const checkDataFile = () => {
        if (typeof window !== 'undefined') {
            const file = sessionStorage.getItem('uploadedDataFile');
            setIsDataFileUploaded(!!file);
        }
    };
    
    checkDataFile();
    window.addEventListener('storage', checkDataFile);
    window.addEventListener('focus', checkDataFile);

    return () => {
        window.removeEventListener('storage', checkDataFile);
        window.removeEventListener('focus', checkDataFile);
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleInputChange = (field: keyof typeof runConfig, value: string) => {
    setRunConfig(prev => ({...prev, [field]: value}));
  };

  const saveRunToHistory = (
    suiteName: string, 
    status: 'Success' | 'Failed', 
    duration: string, 
    passCount: number, 
    failCount: number
  ) => {
      if (typeof window !== 'undefined') {
          const newRun = {
              suite: suiteName,
              status,
              duration,
              date: new Date().toISOString(),
              pass: passCount,
              fail: failCount,
          };
          const history = localStorage.getItem('robotMaestroRuns');
          const runs = history ? JSON.parse(history) : [];
          runs.push(newRun);
          localStorage.setItem('robotMaestroRuns', JSON.stringify(runs));
          window.dispatchEvent(new CustomEvent('runsUpdated'));
      }
  };

  const getSuiteNameForRun = (runType: string) => {
    switch (runType) {
        case 'By Tag':
            return `Tags: ${runConfig.includeTags || 'all'}`;
        case 'By Suite':
            return `Suite: ${runConfig.suite || 'all'}`;
        case 'By Test Case':
            return `Test: ${runConfig.testcase || 'all'}`;
        case 'Orchestrator':
            return 'Orchestrator Run';
        default:
            return 'Unnamed Run';
    }
  }

  const handleRun = async (runType: string) => {
    if (runType === "Orchestrator" && !isDataFileUploaded) {
      toast({
        variant: "destructive",
        title: "Excel or CSV file not uploaded",
        description:
          "Please upload a CSV/Excel file to execute via Orchestrator.",
      });
      return;
    }
    
    setLogs([]);
    addLog(`Starting ${runType} execution...`);
    setStatus("running");
    setLastFailedLogs('');
    const startTime = Date.now();

    try {
      const response = await fetch('/api/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runType, config: runConfig }),
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
      const suiteName = getSuiteNameForRun(runType);

      if (!response.ok) {
        const result = await response.json();
        const errorMessage = result.message || 'The execution server returned an error.';
        addLog(`Execution failed: ${errorMessage}`);
        setStatus("failed");
        saveRunToHistory(suiteName, 'Failed', duration, 0, 1);
        toast({
            variant: "destructive",
            title: "Execution Error",
            description: errorMessage,
        });
        return;
      }
      
      const result = await response.json();
      addLog("Execution logs received from backend:");
      setLogs(prev => [...prev, result.logs]);
      setStatus(result.status === 'success' ? 'success' : 'failed');
      saveRunToHistory(
        suiteName, 
        result.status === 'success' ? 'Success' : 'Failed', 
        duration,
        result.pass_count || 0,
        result.fail_count || 0
      );

      if (result.status === 'success') {
        toast({
          title: "Job Completed Successfully",
          description: `Run finished in ${duration}.`,
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
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
      const suiteName = getSuiteNameForRun(runType);
      
      let toastTitle = "Execution Error";
      let toastDescription = "An unexpected error occurred. Please try again.";

      if (error instanceof TypeError && error.message === 'fetch failed') {
        toastTitle = "Connection Error";
        toastDescription = "Could not connect to the execution service. Please ensure the Python backend is running. See the 'Help & Docs' page for instructions.";
      }
      
      addLog(`Execution failed: ${toastDescription}`);
      setStatus("failed");
      saveRunToHistory(suiteName, 'Failed', duration, 0, 1);
      toast({
        variant: "destructive",
        title: toastTitle,
        description: toastDescription,
      });
    }
  };
  
  const handleDownloadLogs = () => {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `robot-maestro-logs-${new Date().getTime()}.log`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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
              <Input id="include-tags" placeholder="e.g., smoke AND critical" value={runConfig.includeTags} onChange={(e) => handleInputChange('includeTags', e.target.value)} disabled={isRunning} />
              <Label htmlFor="exclude-tags">Exclude Tags</Label>
              <Input id="exclude-tags" placeholder="e.g., wip" value={runConfig.excludeTags} onChange={(e) => handleInputChange('excludeTags', e.target.value)} disabled={isRunning}/>
              <Button onClick={() => handleRun("By Tag")} disabled={isRunning}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Tag
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suite">
            <div className="space-y-4">
              <Label htmlFor="suite-name">Suite Name</Label>
              <Input id="suite-name" placeholder="e.g., tests/smoke_tests.robot" value={runConfig.suite} onChange={(e) => handleInputChange('suite', e.target.value)} disabled={isRunning}/>
              <Button onClick={() => handleRun("By Suite")} disabled={isRunning}>
                 {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Suite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="testcase">
            <div className="space-y-4">
              <Label htmlFor="testcase-name">Test Case Name</Label>
              <Input id="testcase-name" placeholder="e.g., 'User should be able to login'" value={runConfig.testcase} onChange={(e) => handleInputChange('testcase', e.target.value)} disabled={isRunning}/>
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
              <Button onClick={() => handleRun("Orchestrator")} disabled={isRunning || !isDataFileUploaded}>
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
            <ScrollArea className="h-72 w-full rounded-md border bg-muted p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">{logs.join('\n')}</pre>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center gap-2">
              {status === "running" && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {status === "failed" && <XCircle className="h-5 w-5 text-destructive" />}
              <span className="text-sm font-medium">
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div className="flex gap-2">
                {status === 'failed' && <AiAnalysisDialog logs={lastFailedLogs} />}
                <Button variant="outline" onClick={() => setLogs([])} disabled={isRunning || logs.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Logs
                </Button>
                <Button variant="outline" onClick={handleDownloadLogs} disabled={isRunning || logs.length === 0}>
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
