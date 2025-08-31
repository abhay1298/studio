
"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { TestSuite } from '@/components/dashboard/project-explorer';
import type { DependencyStatus } from '@/components/dashboard/dependency-checker';


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
  dependencyCheckResult: DependencyStatus[] | null;
  isCheckingDependencies: boolean;

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
  handleProjectFileUpload: (files: FileList | null) => void;
  handleDataFileUpload: (file: File | null) => void;
  clearProjectFile: () => void;
  clearDataFile: () => void;
  checkDependencies: () => void;
  installDependencies: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

const getInitialState = <T extends unknown>(key: string, defaultValue: T): T => {
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

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
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

  const [projectFileName, setProjectFileName] = useState<string | null>(null);
  const [dataFileName, setDataFileName] = useState<string | null>(null);
  
  const [requirementsContent, setRequirementsContent] = useState<string | null>(null);
  const [dependencyCheckResult, setDependencyCheckResult] = useState<DependencyStatus[] | null>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);


  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoadingSuites, setIsLoadingSuites] = useState(false);
  const [suiteLoadError, setSuiteLoadError] = useState<string | null>(null);

  const [editedData, setEditedData] = useState<TableData>([]);
  const [editedHeaders, setEditedHeaders] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  const { toast } = useToast();
  
  useEffect(() => {
    if (hasHydrated) {
        sessionStorage.setItem('projectFileName', JSON.stringify(projectFileName));
        sessionStorage.setItem('dataFileName', JSON.stringify(dataFileName));
        sessionStorage.setItem('requirementsContent', JSON.stringify(requirementsContent));
        sessionStorage.setItem('editedData', JSON.stringify(editedData));
        sessionStorage.setItem('editedHeaders', JSON.stringify(editedHeaders));
        sessionStorage.setItem('dependencyCheckResult', JSON.stringify(dependencyCheckResult));
    }
  }, [projectFileName, dataFileName, requirementsContent, editedData, editedHeaders, dependencyCheckResult, hasHydrated]);
  
  useEffect(() => {
    setProjectFileName(getInitialState('projectFileName', null));
    setDataFileName(getInitialState('dataFileName', null));
    setRequirementsContent(getInitialState('requirementsContent', null));
    setDependencyCheckResult(getInitialState('dependencyCheckResult', null));
    setEditedData(getInitialState('editedData', []));
    setEditedHeaders(getInitialState('editedHeaders', []));
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (projectFileName === null) {
      setRequirementsContent(null);
      setDependencyCheckResult(null);
    }
  }, [projectFileName]);
  
  const fetchSuites = useCallback(async () => {
    setIsLoadingSuites(true);
    setSuiteLoadError(null);
    try {
        const response = await fetch('/api/list-suites');
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch suites from the backend. Status: ${response.status}`);
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

  const parseAndSetDataFile = useCallback(async (fileContent: ArrayBuffer, dataFileName: string) => {
    try {
      if (dataFileName.endsWith('.csv')) {
        const text = new TextDecoder().decode(fileContent);
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
        const wb = XLSX.read(fileContent, { type: 'array' });
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
  }, []);

  const clearDataFile = useCallback(() => {
    setDataFileName(null);
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
      setDataFileName(file.name);
      const buffer = await readFileAsArrayBuffer(file);
      await parseAndSetDataFile(buffer, file.name);

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

  const handleProjectFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      clearProjectFile();
      return;
    }

    const fileArray = Array.from(files);
    
    // Set project name from the folder name
    const firstPath = files[0].webkitRelativePath;
    const projectName = firstPath.split('/')[0];
    setProjectFileName(projectName);

    setRequirementsContent(null);
    if (!dataFileName) {
        setDataFileName(null);
        setEditedData([]);
        setEditedHeaders([]);
    }

    try {
        let foundReqs = false;
        let foundData = false;

        const filePromises: Promise<void>[] = [];

        for (const file of fileArray) {
            const isReqs = file.name.toLowerCase() === 'requirements.txt';
            const isData = (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx'));

            if (isReqs) {
                foundReqs = true;
                filePromises.push(
                    readFileAsText(file).then(content => {
                        setRequirementsContent(content);
                    })
                );
            }

            if (isData && !dataFileName) {
                foundData = true;
                filePromises.push(
                    readFileAsArrayBuffer(file).then(buffer => {
                        setDataFileName(file.name);
                        parseAndSetDataFile(buffer, file.name);
                    })
                );
            }
        }

        await Promise.all(filePromises);

        if (!foundReqs) {
            toast({
                title: 'Info',
                description: `requirements.txt not found in the project.`,
            });
        }
        
        toast({
            title: 'Project Loaded',
            description: `${projectName} loaded successfully.`,
            action: <FileCheck2 className="text-green-500" />,
        });

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error processing project folder',
            description: 'Could not read the selected folder. Please try again.',
        });
    }
  }, [clearProjectFile, parseAndSetDataFile, toast, dataFileName]);

  const checkDependencies = useCallback(async () => {
    if (!requirementsContent) {
        toast({
            variant: 'destructive',
            title: 'No requirements.txt found',
            description: 'Cannot check dependencies because no requirements.txt was found in the project.',
        });
        setDependencyCheckResult(null);
        return;
    }
    setIsCheckingDependencies(true);
    setDependencyCheckResult(null);
    try {
      const response = await fetch('/api/check-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: requirementsContent }),
      });
      if (!response.ok) throw new Error('Failed to check dependencies.');

      const result: DependencyStatus[] = await response.json();
      setDependencyCheckResult(result);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to the dependency checker service.' });
      setDependencyCheckResult(null);
    } finally {
        setIsCheckingDependencies(false);
    }
  }, [requirementsContent, toast]);
  
  const installDependencies = useCallback(() => {
    if (!dependencyCheckResult) return;
    
    toast({
        title: 'Installation in Progress',
        description: 'Simulating installation of missing packages...',
    });
    
    setTimeout(() => {
        const newStatuses = dependencyCheckResult.map(d => ({ ...d, status: 'installed' as 'installed' }));
        setDependencyCheckResult(newStatuses);
        toast({
            title: 'Installation Complete',
            description: 'All missing libraries have been "installed".',
            action: <CheckCircle2 className="text-green-500" />
        });
    }, 2000);
  }, [dependencyCheckResult, toast]);
  
  const value = {
    status,
    logs,
    lastFailedLogs,
    runConfig,
    projectFileName,
    dataFileName,
    requirementsContent,
    dependencyCheckResult,
    isCheckingDependencies,
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
    handleProjectFileUpload,
    handleDataFileUpload,
    clearProjectFile,
    clearDataFile,
    checkDependencies,
    installDependencies,
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
