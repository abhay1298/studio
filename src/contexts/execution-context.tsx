
"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, FileX2, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { TestSuite } from '@/components/dashboard/project-explorer';


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
  projectFile: File | null;
  dataFile: File | null;
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

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const dataURLtoBlob = (dataurl: string) => {
    return fetch(dataurl).then(res => res.blob());
};


const validateOrchestratorData = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    const fileDataUrl = sessionStorage.getItem('dataFileContent');
    const fileName = sessionStorage.getItem('dataFileName');
    if (!fileDataUrl || !fileName) {
        return 'No data file has been uploaded.';
    }

    try {
        const blob = await dataURLtoBlob(fileDataUrl);
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

const getInitialState = <T,>(key: string, defaultValue: T, transform?: (value: string) => any): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.sessionStorage.getItem(key);
        if (!item) return defaultValue;
        return transform ? transform(item) : JSON.parse(item);
    } catch (error) {
        console.warn(`Error reading sessionStorage key "${key}":`, error);
        return defaultValue;
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

  const [projectFile, setProjectFile] = useState<File | null>(() => {
    if (typeof window === 'undefined') return null;
    const name = sessionStorage.getItem('projectFileName');
    return name ? new File([], name) : null;
  });
  const [dataFile, setDataFile] = useState<File | null>(() => {
    if (typeof window === 'undefined') return null;
    const name = sessionStorage.getItem('dataFileName');
    return name ? new File([], name) : null;
  });

  const [requirementsContent, setRequirementsContent] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('requirementsContent');
  });

  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoadingSuites, setIsLoadingSuites] = useState(false);
  const [suiteLoadError, setSuiteLoadError] = useState<string | null>(null);

  const [editedData, setEditedData] = useState<TableData>(getInitialState('editedData', []));
  const [editedHeaders, setEditedHeaders] = useState<string[]>(getInitialState('editedHeaders', []));

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('editedData', JSON.stringify(editedData));
      sessionStorage.setItem('editedHeaders', JSON.stringify(editedHeaders));
    }
  }, [editedData, editedHeaders]);


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
        case 'Run All':
            return 'Full Test Suite';
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

  const parseAndSetDataFile = useCallback(async (file: File) => {
    try {
        if (file.name.endsWith('.csv')) {
            const text = await file.text();
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
        } else if (file.name.endsWith('.xlsx')) {
            const arrayBuffer = await file.arrayBuffer();
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
    setProjectFile(null);
    setRequirementsContent(null);
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('projectFileName');
        sessionStorage.removeItem('projectFileContent');
        sessionStorage.removeItem('requirementsContent');
    }
    toast({ title: 'Project Cleared' });
  }, [toast]);

  const clearDataFile = useCallback(() => {
    setDataFile(null);
    setEditedData([]);
    setEditedHeaders([]);
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('dataFileName');
        sessionStorage.removeItem('dataFileContent');
        sessionStorage.removeItem('editedData');
        sessionStorage.removeItem('editedHeaders');
    }
    toast({ title: 'Data File Cleared' });
  }, [toast]);

  const handleDataFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      clearDataFile();
      return;
    }
    setDataFile(file);
    try {
      if (typeof window !== 'undefined') {
        const dataUrl = await fileToDataURL(file);
        sessionStorage.setItem('dataFileName', file.name);
        sessionStorage.setItem('dataFileContent', dataUrl);
      }
      parseAndSetDataFile(file);
      toast({
        title: 'Data File Uploaded',
        description: file.name,
        action: <FileCheck2 className="text-green-500" />,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: "Could not read data file" });
    }
  }, [clearDataFile, parseAndSetDataFile, toast]);

  const handleProjectFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      clearProjectFile();
      return;
    }

    setProjectFile(file);
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('projectFileName', file.name);
    }
    setRequirementsContent(null);
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('requirementsContent');
    }
    
    try {
      if (typeof window !== 'undefined') {
          const dataUrl = await fileToDataURL(file);
          sessionStorage.setItem('projectFileContent', dataUrl);
      }

      toast({
        title: 'Project Uploaded Successfully',
        description: file.name,
        action: <FileCheck2 className="text-green-500" />,
      });

      const zip = await JSZip.loadAsync(file);
      
      let reqFileEntry: JSZip.JSZipObject | null = null;
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.endsWith('requirements.txt') && !zipEntry.dir) {
          reqFileEntry = zipEntry;
        }
      });

      if (reqFileEntry) {
        const content = await reqFileEntry.async('string');
        setRequirementsContent(content);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('requirementsContent', content);
        }
         toast({
            title: 'Found requirements.txt',
            description: "Dependencies are ready to be scanned.",
        });
      } else {
        toast({
            variant: 'default',
            title: 'No requirements.txt found',
            description: "The uploaded project does not contain a requirements.txt file.",
        });
      }
      
      if (!dataFile) {
        let dataFileEntry: JSZip.JSZipObject | null = null;
        zip.forEach((relativePath, zipEntry) => {
          if ((relativePath.toLowerCase().endsWith('.csv') || relativePath.toLowerCase().endsWith('.xlsx')) && !zipEntry.dir) {
            dataFileEntry = zipEntry;
          }
        });
        
        if (dataFileEntry) {
          const content = await dataFileEntry.async('blob');
          const foundDataFile = new File([content], dataFileEntry.name);
          handleDataFileUpload(foundDataFile);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error reading zip file:", errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error processing project',
        description: 'Could not read the contents of the uploaded zip file. It may be corrupt or not a valid zip file.',
      });
      clearProjectFile();
    }
  }, [clearProjectFile, dataFile, handleDataFileUpload, toast]);
  
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
        setSuiteLoadError(e.message || 'An unknown error occurred.');
    } finally {
        setIsLoadingSuites(false);
    }
  }, []);

  const value = {
    status,
    logs,
    lastFailedLogs,
    runConfig,
    projectFile,
    dataFile,
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
