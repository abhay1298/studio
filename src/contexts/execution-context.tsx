
"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, FileX2, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { TestSuite } from '@/components/dashboard/project-explorer';
import JSZip from 'jszip';


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
  
  projectFileName: string | null;
  dataFileName: string | null;
  
  requirementsContent: string | null;
  testSuites: TestSuite[];
  isLoadingSuites: boolean;
  suiteLoadError: string | null;
  editedData: TableData;
  setEditedData: Dispatch<SetStateAction<TableData>>;
  editedHeaders: string[];
  setEditedHeaders: Dispatch<SetStateAction<string[]>>;
  fetchSuites: () => Promise<void>;
  handleInputChange: (field: keyof RunConfig, value: string) => void;
  handleRun: (runType: string) => Promise<void>;
  handleStop: () => Promise<void>;
  clearLogs: () => void;
  handleProjectFileUpload: (file: File | null) => void;
  handleDataFileUpload: (file: File | null) => void;
  clearProjectFile: () => void;
  clearDataFile: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

const getInitialState = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.sessionStorage.getItem(key);
        if (!item) return defaultValue;
        if (item === 'null' || item === 'undefined') return defaultValue;
        try {
            return JSON.parse(item);
        } catch {
            return item as any;
        }
    } catch (error) {
        console.warn(`Error reading sessionStorage key "${key}":`, error);
        return defaultValue;
    }
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Failed to read file: ${reader.error ? reader.error.message : 'Unknown error'}`));
        reader.readAsDataURL(file);
    });
};

const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Could not parse MIME type from data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
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

  const [projectFileName, setProjectFileName] = useState<string | null>(() => getInitialState('projectFileName', null));
  const [dataFileName, setDataFileName] = useState<string | null>(() => getInitialState('dataFileName', null));
  const [dataFileContent, setDataFileContent] = useState<string | null>(() => getInitialState('dataFileContent', null));
  const [requirementsContent, setRequirementsContent] = useState<string | null>(() => getInitialState('requirementsContent', null));

  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoadingSuites, setIsLoadingSuites] = useState(false);
  const [suiteLoadError, setSuiteLoadError] = useState<string | null>(null);

  const [editedData, setEditedData] = useState<TableData>(() => getInitialState('editedData', []));
  const [editedHeaders, setEditedHeaders] = useState<string[]>(() => getInitialState('editedHeaders', []));

  const { toast } = useToast();
  
  useEffect(() => {
    sessionStorage.setItem('projectFileName', JSON.stringify(projectFileName));
    sessionStorage.setItem('dataFileName', JSON.stringify(dataFileName));
    sessionStorage.setItem('dataFileContent', JSON.stringify(dataFileContent));
    sessionStorage.setItem('requirementsContent', JSON.stringify(requirementsContent));
    sessionStorage.setItem('editedData', JSON.stringify(editedData));
    sessionStorage.setItem('editedHeaders', JSON.stringify(editedHeaders));
  }, [projectFileName, dataFileName, dataFileContent, requirementsContent, editedData, editedHeaders]);
  
  const fetchSuites = useCallback(async () => {
    setIsLoadingSuites(true);
    setSuiteLoadError(null);
    try {
        const response = await fetch('/api/list-suites');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch suites from the backend.');
        }
        const suites = await response.json();
        setTestSuites(suites);
    } catch (e: any) {
        console.error("Failed to fetch test suites:", e);
        setTestSuites([]); // Clear suites on error
        setSuiteLoadError(e.message || 'An unknown error occurred.');
    } finally {
        setIsLoadingSuites(false);
    }
  }, []);

  // Fetch suites on initial load
  useEffect(() => {
    fetchSuites();
  }, [fetchSuites]);

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
              id: `RUN-${new Date().getTime()}`,
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
            return `Orchestrator Run: ${dataFileName || 'Unknown Data File'}`;
        case 'Run All':
            return 'Full Test Suite';
        default:
            return 'Unnamed Run';
    }
  }, [runConfig, dataFileName]);


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
    try {
        const response = await fetch('/api/stop-tests', { method: 'POST' });
        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }
        const result = await response.json();
        addLog(result.message);
        setStatus('stopped'); // Set status to stopped only after backend confirmation
        toast({
            title: "Execution Stopped",
            description: "The test run has been terminated.",
        });

    } catch (e) {
        addLog('Failed to stop execution. It may have already completed.');
        setStatus('failed'); // Assume it failed if stop command fails
        toast({
            variant: "destructive",
            title: "Stop Failed",
            description: "Could not stop the test run. Check the backend server.",
        });
    }
  }, [addLog, toast]);

  const parseAndSetDataFile = useCallback(async (dataFileContent: string, dataFileName: string) => {
    try {
      const blob = dataURLtoBlob(dataFileContent);
      if (dataFileName.endsWith('.csv')) {
        const text = await blob.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const parsedHeaders = result.meta.fields || [];
            const parsedData = result.data.map((row: any) => parsedHeaders.map(h => row[h])) as TableData;
            setEditedHeaders(parsedHeaders);
            setEditedData(parsedData);
          }
        });
      } else if (dataFileName.endsWith('.xlsx')) {
        const arrayBuffer = await blob.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (jsonData.length > 0) {
          const parsedHeaders = jsonData[0].map(String);
          const parsedData = jsonData.slice(1);
          setEditedHeaders(parsedHeaders);
          setEditedData(parsedData);
        }
      }
    } catch (e) {
      console.error("Error parsing data file", e);
      toast({ variant: 'destructive', title: "Error reading data file" });
    }
  }, [toast]);

  const clearProjectFile = useCallback(() => {
    setProjectFileName(null);
    setRequirementsContent(null);
    toast({ title: 'Project Cleared' });
  }, [toast]);

  const clearDataFile = useCallback(() => {
    setDataFileName(null);
    setDataFileContent(null);
    setEditedData([]);
    setEditedHeaders([]);
    toast({ title: 'Data File Cleared' });
  }, [toast]);

  const handleDataFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      clearDataFile();
      return;
    }
    
    try {
      const dataUrl = await fileToDataURL(file);

      setDataFileContent(dataUrl);
      setDataFileName(file.name);
      await parseAndSetDataFile(dataUrl, file.name);

      toast({
        title: 'Data File Uploaded',
        description: file.name,
        action: <FileCheck2 className="text-green-500" />,
      });
      window.dispatchEvent(new CustomEvent('projectUpdated'));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      toast({ variant: 'destructive', title: "Could not read data file", description: errorMessage });
      clearDataFile();
    }
  }, [clearDataFile, parseAndSetDataFile, toast]);

  const handleProjectFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      clearProjectFile();
      return;
    }
  
    setProjectFileName(file.name);
  
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(buffer);
      let reqsFound = false;
  
      // Find and read requirements.txt
      const reqFile = Object.values(zip.files).find(f => f.name.endsWith('requirements.txt') && !f.dir);
      if (reqFile) {
        const content = await reqFile.async('string');
        setRequirementsContent(content);
        reqsFound = true;
      } else {
        setRequirementsContent(null);
      }
      
      // Find and process a data file (CSV or XLSX)
      const dataFile = Object.values(zip.files).find(f => (f.name.endsWith('.csv') || f.name.endsWith('.xlsx')) && !f.dir);
      if (dataFile) {
        const dataUrl = await dataFile.async('base64');
        const fullDataUrl = `data:${dataFile.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};base64,${dataUrl}`;
        setDataFileContent(fullDataUrl);
        setDataFileName(dataFile.name);
        await parseAndSetDataFile(fullDataUrl, dataFile.name);
      }

      toast({
        title: 'Project Inspected Successfully',
        description: `${file.name} loaded. ${reqsFound ? 'requirements.txt found.' : 'requirements.txt not found.'}`,
        action: <FileCheck2 className="text-green-500" />,
      });
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error reading zip file:", errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error processing project',
        description: `Could not process the project file. Error: ${errorMessage}`,
      });
      clearProjectFile();
    }
  }, [clearProjectFile, parseAndSetDataFile, toast]);
  
  const value = {
    status,
    logs,
    lastFailedLogs,
    runConfig,
    projectFileName,
    dataFileName,
    requirementsContent,
    testSuites,
    isLoadingSuites,
    suiteLoadError,
    editedData,
    setEditedData,
    editedHeaders,
    setEditedHeaders,
    fetchSuites,
    handleInputChange,
    handleRun,
    handleStop,
    clearLogs,
    handleProjectFileUpload,
    handleDataFileUpload,
    clearProjectFile,
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

    
