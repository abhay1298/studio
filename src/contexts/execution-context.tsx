
"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, XCircle, StopCircle, Loader2 } from 'lucide-react';
import type { TestSuite } from '@/components/dashboard/project-explorer';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';


type ExecutionStatus = "idle" | "running" | "success" | "failed" | "stopped";
type RunConfig = {
  includeTags: string;
  excludeTags: string;
  suite: string;
  testcase: string;
};

type TableData = (string | number)[][];

interface ExecutionContextType {
  status: ExecutionStatus;
  logs: string[];
  lastFailedLogs: string;
  runConfig: RunConfig;
  
  dataFileName: string | null;
  
  testSuites: TestSuite[];
  isLoadingSuites: boolean;
  suiteLoadError: string | null;

  editedData: TableData;
  setEditedData: Dispatch<SetStateAction<TableData>>;
  editedHeaders: string[];
  setEditedHeaders: Dispatch<SetStateAction<string[]>>;
  hasHydrated: boolean;

  fetchSuites: () => Promise<void>;
  
  handleInputChange: (field: keyof RunConfig, value: string) => void;
  handleRun: (runType: string) => Promise<void>;
  handleStop: () => Promise<void>;
  clearLogs: () => void;

  handleDataFileUpload: (file: File | null) => void;
  clearDataFile: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

const getInitialState = <T extends unknown>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        if (!item || item === 'undefined') return defaultValue;
        return JSON.parse(item);
    } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
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

  const [dataFileName, setDataFileName] = useState<string | null>(null);
  
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoadingSuites, setIsLoadingSuites] = useState(false);
  const [suiteLoadError, setSuiteLoadError] = useState<string | null>(null);

  const [editedData, setEditedData] = useState<TableData>([]);
  const [editedHeaders, setEditedHeaders] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  const { toast } = useToast();
  
  const fetchSuites = useCallback(async () => {
    setIsLoadingSuites(true);
    setSuiteLoadError(null);
    try {
      const response = await fetch('/api/list-suites');
      const data = await response.json();

      if (!response.ok) {
        // If the API returns a JSON error, use that message
        const errorMessage = data.error || `Failed to fetch suites. Status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      setTestSuites(data);
    } catch (e: any) {
      console.error("Failed to fetch test suites:", e);
      // Set the error state to be displayed in the UI
      setSuiteLoadError(e.message || 'An unknown error occurred while fetching suites.');
    } finally {
      setIsLoadingSuites(false);
    }
  }, []);

  const handleDataFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setDataFileName(null);
      setEditedData([]);
      setEditedHeaders([]);
      return;
    }
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please upload a .csv or .xlsx file.',
        });
        return;
    }
    
    setDataFileName(file.name);

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length > 0) {
        setEditedHeaders(data[0].map(String));
        setEditedData(data.slice(1));
        toast({
          title: 'Data File Loaded',
          description: `Successfully parsed ${file.name}.`,
          action: <FileCheck2 className="text-green-500" />,
        });
      } else {
        setEditedHeaders([]);
        setEditedData([]);
        toast({
          variant: 'destructive',
          title: 'Empty File',
          description: 'The uploaded file appears to be empty.',
        });
      }

    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: 'Could not read or parse the uploaded file.',
      });
      setDataFileName(null);
      setEditedData([]);
      setEditedHeaders([]);
    }
  }, [toast]);
  
  useEffect(() => {
    setDataFileName(getInitialState('dataFileName', null));
    setEditedData(getInitialState('editedData', []));
    setEditedHeaders(getInitialState('editedHeaders', []));
    setHasHydrated(true);

    fetchSuites();
  }, [fetchSuites]);

  useEffect(() => {
    if (hasHydrated) {
        try {
            localStorage.setItem('dataFileName', JSON.stringify(dataFileName));
            localStorage.setItem('editedData', JSON.stringify(editedData));
            localStorage.setItem('editedHeaders', JSON.stringify(editedHeaders));
        } catch (error) {
            console.warn(`Error writing to localStorage:`, error);
        }
    }
  }, [dataFileName, editedData, editedHeaders, hasHydrated]);
  
  const clearDataFile = useCallback(() => {
    setDataFileName(null);
    setEditedData([]);
    setEditedHeaders([]);
  }, []);
  
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
    videoFile: string | null,
    rawLogs: string[]
  ) => {
      if (typeof window !== 'undefined') {
          const newRun = {
              id: `RUN-${new Date().getTime()}`,
              suite: suiteName,
              status,
              duration,
              date: new Date().toISOString(),
              pass: passCount,
              fail: failCount,
              reportFile,
              logFile,
              videoFile,
              rawLogs,
          };
          const historyJSON = localStorage.getItem('robotMaestroRuns');
          let runs = [];
          if (historyJSON) {
            try {
              runs = JSON.parse(historyJSON);
            } catch (e) {
              console.error("Could not parse localStorage, starting fresh.", e);
            }
          }
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
            return `Orchestrator Run: ${dataFileName || 'Unknown Data File'}`;
        case 'Run All':
            return 'Full Test Suite';
        default:
            return 'Unnamed Run';
    }
  }, [runConfig, dataFileName]);

  const handleRun = useCallback(async (runType: string) => {
    let pollingInterval: NodeJS.Timeout;
    setLogs([]);
    addLog(`Starting ${runType} execution...`);
    setStatus("running");
    setLastFailedLogs('');
    const startTime = Date.now();

    const configForRun = { ...runConfig };
    if (runType === 'Orchestrator') {
        const orchestratorData = {
            headers: editedHeaders,
            data: editedData,
        };
        (configForRun as any).orchestratorData = orchestratorData;
    }
  
    try {
      const runResponse = await fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runType, config: configForRun }),
      });
  
      if (!runResponse.ok) {
        const result = await runResponse.json();
        throw new Error(result.message || 'The execution server failed to start the run.');
      }
  
      addLog("Test execution started successfully on the backend.");
  
      pollingInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/status');
          const data = await statusResponse.json();
  
          if (data.logs) {
            setLogs(data.logs);
          }
  
          if (data.status !== 'running') {
            clearInterval(pollingInterval);
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
            const suiteName = getSuiteNameForRun(runType);
            const finalStatus = data.status === 'success' ? 'success' : data.status === 'stopped' ? 'stopped' : 'failed';
            setStatus(finalStatus);
  
            saveRunToHistory(
              suiteName,
              finalStatus === 'success' ? 'Success' : finalStatus === 'stopped' ? 'Stopped' : 'Failed',
              duration,
              data.pass_count || 0,
              data.fail_count || 0,
              data.reportFile || null,
              data.logFile || null,
              data.videoFile || null,
              data.logs || []
            );
  
            if (finalStatus === 'success') {
              toast({
                title: "Job Completed Successfully",
                description: `Run finished in ${duration}.`,
                action: <CheckCircle2 className="text-green-500" />,
              });
            } else if (finalStatus === 'failed') {
              setLastFailedLogs(data.logs.join('\n'));
              toast({
                variant: "destructive",
                title: "Execution Failed",
                description: "Check logs for details.",
                action: <XCircle />,
              });
            } else if (finalStatus === 'stopped') {
               toast({
                  title: "Execution Stopped",
                  description: "The test run was terminated by the user.",
                  action: <StopCircle className="text-yellow-500" />,
              });
            }
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(pollingInterval);
          setStatus('failed');
          addLog("Error polling for status. Connection to backend might be lost.");
          toast({ variant: 'destructive', title: 'Connection Error', description: 'Lost connection to the backend during execution.' });
        }
      }, 2000);
  
    } catch (error: any) {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';
      const suiteName = getSuiteNameForRun(runType);
      
      let toastTitle = "Execution Error";
      let toastDescription = error.message || "An unexpected error occurred. Please try again.";
  
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toastTitle = "Connection Error";
        toastDescription = "Could not connect to the execution service. Please ensure the Python backend is running.";
      }
      
      addLog(`Execution failed: ${toastDescription}`);
      setStatus("failed");
      saveRunToHistory(suiteName, 'Failed', duration, 0, 1, null, null, null, logs);
      toast({
        variant: "destructive",
        title: toastTitle,
        description: toastDescription,
      });
    }
  }, [addLog, getSuiteNameForRun, runConfig, editedData, editedHeaders, saveRunToHistory, toast, logs]);

  const handleStop = useCallback(async () => {
    addLog('--- Stop signal sent to process ---');
    try {
        const response = await fetch('/api/stop-tests', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server responded with an error.');
        }
        const result = await response.json();
        addLog(result.message);
        toast({
            title: "Stop Signal Sent",
            description: "The test run will be terminated.",
        });

    } catch (e: any) {
        addLog(`Failed to send stop signal: ${e.message}`);
        toast({
            variant: "destructive",
            title: "Stop Failed",
            description: "Could not stop the test run. It may have already completed.",
        });
    }
  }, [addLog, toast]);

  const value = {
    status,
    logs,
    lastFailedLogs,
    runConfig,
    dataFileName,
    testSuites,
    isLoadingSuites,
    suiteLoadError,
    editedData,
    setEditedData,
    editedHeaders,
    setEditedHeaders,
    hasHydrated,
    fetchSuites,
    handleInputChange,
    handleRun,
    handleStop,
    clearLogs,
    handleDataFileUpload,
    clearDataFile,
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

    