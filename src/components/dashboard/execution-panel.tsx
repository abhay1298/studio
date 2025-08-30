
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
  StopCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AiAnalysisDialog } from "./ai-analysis-dialog";
import { useExecutionContext } from "@/contexts/execution-context";

export function ExecutionPanel() {
  const { 
      status, 
      logs, 
      lastFailedLogs,
      runConfig,
      handleInputChange,
      handleRun,
      handleStop,
      clearLogs
  } = useExecutionContext();

  const { toast } = useToast();
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

  const handleRunClick = (runType: string) => {
    if (runType === "Orchestrator" && !isDataFileUploaded) {
      toast({
        variant: "destructive",
        title: "Excel or CSV file not uploaded",
        description:
          "Please upload a CSV/Excel file to execute via Orchestrator.",
      });
      return;
    }
    handleRun(runType);
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
            <TabsTrigger value="tag" disabled={isRunning}>By Tag</TabsTrigger>
            <TabsTrigger value="suite" disabled={isRunning}>By Suite</TabsTrigger>
            <TabsTrigger value="testcase" disabled={isRunning}>By Test Case</TabsTrigger>
            <TabsTrigger value="orchestrator" disabled={isRunning}>Orchestrator</TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent>
          <TabsContent value="tag">
            <div className="space-y-4">
              <Label htmlFor="include-tags">Include Tags</Label>
              <Input id="include-tags" placeholder="e.g., smoke AND critical" value={runConfig.includeTags} onChange={(e) => handleInputChange('includeTags', e.target.value)} disabled={isRunning} />
              <Label htmlFor="exclude-tags">Exclude Tags</Label>
              <Input id="exclude-tags" placeholder="e.g., wip" value={runConfig.excludeTags} onChange={(e) => handleInputChange('excludeTags', e.target.value)} disabled={isRunning}/>
              <Button onClick={() => handleRunClick("By Tag")} disabled={isRunning || !runConfig.includeTags.trim()}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Tag
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suite">
            <div className="space-y-4">
              <Label htmlFor="suite-name">Suite Name</Label>
              <Input id="suite-name" placeholder="e.g., tests/smoke_tests.robot" value={runConfig.suite} onChange={(e) => handleInputChange('suite', e.target.value)} disabled={isRunning}/>
              <Button onClick={() => handleRunClick("By Suite")} disabled={isRunning || !runConfig.suite.trim()}>
                 {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run by Suite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="testcase">
            <div className="space-y-4">
              <Label htmlFor="testcase-name">Test Case Name</Label>
              <Input id="testcase-name" placeholder="e.g., 'User should be able to login'" value={runConfig.testcase} onChange={(e) => handleInputChange('testcase', e.target.value)} disabled={isRunning}/>
              <Button onClick={() => handleRunClick("By Test Case")} disabled={isRunning || !runConfig.testcase.trim()}>
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
              <Button onClick={() => handleRunClick("Orchestrator")} disabled={isRunning || !isDataFileUploaded}>
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run via Orchestrator
              </Button>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      {(status !== "idle" || logs.length > 0) && (
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
              {status === "stopped" && <StopCircle className="h-5 w-5 text-yellow-500" />}
              <span className="text-sm font-medium">
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div className="flex gap-2">
                {status === 'failed' && <AiAnalysisDialog logs={lastFailedLogs} />}
                
                {isRunning && (
                    <Button variant="destructive" onClick={handleStop} disabled={!isRunning}>
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop
                    </Button>
                )}
                
                <Button variant="outline" onClick={clearLogs} disabled={isRunning || logs.length === 0}>
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
