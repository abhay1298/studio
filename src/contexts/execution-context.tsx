
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from 'lucide-react';


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
      }

    } catch (error) {
       // A special check to see if the status was changed by the user stopping the run
      if (status === 'running') {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
        const suiteName = getSuiteNameForRun(runType);
        
        let toastTitle = "Execution Error";
        let toastDescription = "An unexpected error occurred. Please try again.";

        if (error instanceof TypeError && error.message === 'fetch failed') {
            toastTitle = "Connection Error";
            toastDescription = "Could not connect to the execution service. Please ensure the Python backend is running.";
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
