
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';


type ExecutionStatus = "idle" | "running" | "success" | "failed" | "stopped";
type RunConfig = {
  includeTags: string;
  excludeTags: string;
  suite: string;
  testcase: string;
};

interface ExecutionContextType {
  status: ExecutionStatus;
  logs: string[];
  lastFailedLogs: string;
  runConfig: RunConfig;
  handleInputChange: (field: keyof RunConfig, value: string) => void;
  handleRun: (runType: string) => Promise<void>;
  handleStop: () => Promise<void>;
  clearLogs: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

const validateOrchestratorData = async (): Promise<string | null> => {
    const fileDataUrl = sessionStorage.getItem('uploadedDataFile');
    const fileName = sessionStorage.getItem('uploadedDataFileName');
    if (!fileDataUrl || !fileName) {
        return 'No data file has been uploaded.';
    }

    try {
        const res = await fetch(fileDataUrl);
        const blob = await res.blob();
        let headers: string[] = [];
        let data: any[] = [];

        if (fileName.endsWith('.csv')) {
            const text = await blob.text();
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            headers = result.meta.fields || [];
            data = result.data;
        } else if (fileName.endsWith('.xlsx')) {
            const arrayBuffer = await blob.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            data = XLSX.utils.sheet_to_json(ws);
            if (data.length > 0) {
                headers = Object.keys(data[0]);
            }
        }
        
        const lowerCaseHeaders = headers.map(h => h.toLowerCase());
        if (!lowerCaseHeaders.includes('id') || !lowerCaseHeaders.includes('priority')) {
            return "Data file must contain 'id' and 'priority' columns.";
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const lowerCaseRowKeys = Object.keys(row).reduce((acc, key) => {
                acc[key.toLowerCase()] = row[key];
                return acc;
            }, {} as any);

            if (!lowerCaseRowKeys.id || !lowerCaseRowKeys.priority) {
                return `Row ${i + 2} in your data file has missing 'id' or 'priority'. Please fix it in the Data Editor.`;
            }
        }

        return null; // No errors
    } catch (e) {
        console.error("Validation error:", e);
        return "Could not read or validate the data file. Please try uploading it again.";
    }
};

export function ExecutionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [lastFailedLogs, setLastFailedLogs] = useState('');
  const [runConfig, setRunConfig] = useState<RunConfig>({
    includeTags: '',
    excludeTags: '',
    suite: '',
    testcase: '',
  });
  const { toast } = useToast();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleInputChange = useCallback((field: keyof RunConfig, value: string) => {
    setRunConfig(prev => ({ ...prev, [field]: value }));
  }, []);
  
  const saveRunToHistory = useCallback((
    suiteName: string, 
    status: 'Success' | 'Failed' | 'Stopped', 
    duration: string, 
    passCount: number, 
    failCount: number,
    reportFile: string | null,
    logFile: string | null,
    videoFile: string | null
  ) => {
      if (typeof window !== 'undefined') {
          const newRun = {
              id: `RUN-${new Date().getTime()}`, // Add unique ID
              suite: suiteName,
              status,
              duration,
              date: new Date().toISOString(),
              pass: passCount,
              fail: failCount,
              reportFile,
              logFile,
              videoFile
          };
          const history = localStorage.getItem('robotMaestroRuns');
          const runs = history ? JSON.parse(history) : [];
          runs.push(newRun);
          localStorage.setItem('robotMaestroRuns', JSON.stringify(runs));
          window.dispatchEvent(new CustomEvent('runsUpdated'));
      }
  }, []);

  const getSuiteNameForRun = useCallback((runType: string) => {
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
  }, [runConfig]);


  const handleRun = useCallback(async (runType: string) => {
    if (runType === 'Orchestrator') {
        const validationError = await validateOrchestratorData();
        if (validationError) {
            toast({
                variant: 'destructive',
                title: 'Orchestrator Validation Failed',
                description: validationError,
            });
            return;
        }
    }
    
    setLogs([]);
    addLog(`Starting ${runType} execution...`);
    setStatus("running");
    setLastFailedLogs('');
    const startTime = Date.now();

    try {
      const response = await fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runType, config: runConfig }),
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
      const suiteName = getSuiteNameForRun(runType);
      
      // A special check to see if the status was changed by the user stopping the run
      if (status === 'running') {
        if (!response.ok) {
            const result = await response.json();
            const errorMessage = result.message || 'The execution server returned an error.';
            addLog(`Execution failed: ${errorMessage}`);
            setStatus("failed");
            saveRunToHistory(suiteName, 'Failed', duration, 0, 1, null, null, null);
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
            result.fail_count || 0,
            result.reportFile || null,
            result.logFile || null,
            result.videoFile || null
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
      }

    } catch (error) {
       // A special check to see if the status was changed by the user stopping the run
      if (status === 'running') {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
        const suiteName = getSuiteNameForRun(runType);
        
        let toastTitle = "Execution Error";
        let toastDescription = "An unexpected error occurred. Please try again.";

        if (error instanceof TypeError && error.message.includes('fetch')) {
            toastTitle = "Connection Error";
            toastDescription = "Could not connect to the execution service. Please ensure the Python backend is running.";
        }
        
        addLog(`Execution failed: ${toastDescription}`);
        setStatus("failed");
        saveRunToHistory(suiteName, 'Failed', duration, 0, 1, null, null, null);
        toast({
            variant: "destructive",
            title: toastTitle,
            description: toastDescription,
        });
      }
    }
  }, [addLog, getSuiteNameForRun, runConfig, saveRunToHistory, status, toast]);

  const handleStop = useCallback(async () => {
    addLog('Attempting to stop execution...');
    // Set status immediately to give user feedback and prevent race conditions.
    setStatus('stopped');
    try {
        const response = await fetch('/api/stop-tests', { method: 'POST' });
        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }
        const result = await response.json();
        addLog(result.message);
        toast({
            title: "Execution Stopped",
            description: "The test run has been terminated.",
        });

    } catch (e) {
        addLog('Failed to stop execution. It may have already completed.');
        toast({
            variant: "destructive",
            title: "Stop Failed",
            description: "Could not stop the test run. Check the backend server.",
        });
    }
  }, [addLog, toast]);

  const value = {
    status,
    logs,
    lastFailedLogs,
    runConfig,
    handleInputChange,
    handleRun,
    handleStop,
    clearLogs,
  };

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecutionContext() {
  const context = useContext(ExecutionContext);
  if (context === undefined) {
    throw new Error('useExecutionContext must be used within an ExecutionProvider');
  }
  return context;
}
