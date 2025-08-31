
"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, GitBranch, XCircle, FileWarning, StopCircle } from 'lucide-react';
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
  projectFileSource: 'local' | 'git' | null;
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
  handleGitImport: (url: string) => void;
  clearProjectFile: () => void;
  handleDataFileUpload: (file: File | null) => void;
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
        if (!item || item === 'undefined') return defaultValue;
        return JSON.parse(item);
    } catch (error) {
        console.warn(`Error reading sessionStorage key "${key}":`, error);
        return defaultValue;
    }
};

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
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

  const [projectFileName, setProjectFileName] = useState<string | null>(null);
  const [projectFileSource, setProjectFileSource] = useState<'local' | 'git' | null>(null);
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
    setProjectFileName(getInitialState('projectFileName', null));
    setProjectFileSource(getInitialState('projectFileSource', null));
    setDataFileName(getInitialState('dataFileName', null));
    setRequirementsContent(getInitialState('requirementsContent', null));
    setDependencyCheckResult(getInitialState('dependencyCheckResult', null));
    setEditedData(getInitialState('editedData', []));
    setEditedHeaders(getInitialState('editedHeaders', []));
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated) {
        try {
            sessionStorage.setItem('projectFileName', JSON.stringify(projectFileName));
            sessionStorage.setItem('projectFileSource', JSON.stringify(projectFileSource));
            sessionStorage.setItem('dataFileName', JSON.stringify(dataFileName));
            sessionStorage.setItem('requirementsContent', JSON.stringify(requirementsContent));
            sessionStorage.setItem('editedData', JSON.stringify(editedData));
            sessionStorage.setItem('editedHeaders', JSON.stringify(editedHeaders));
            sessionStorage.setItem('dependencyCheckResult', JSON.stringify(dependencyCheckResult));
        } catch (error) {
            console.warn(`Error writing to sessionStorage:`, error);
        }
    }
  }, [projectFileName, projectFileSource, dataFileName, requirementsContent, editedData, editedHeaders, dependencyCheckResult, hasHydrated]);
  
  const clearDataFile = useCallback(() => {
    setDataFileName(null);
    setEditedData([]);
    setEditedHeaders([]);
  }, []);

  const clearProjectFile = useCallback(() => {
    setProjectFileName(null);
    setProjectFileSource(null);
    setRequirementsContent(null);
    setDependencyCheckResult(null);
    clearDataFile();
    setTestSuites([]);
    toast({ title: 'Project Cleared' });
  }, [toast, clearDataFile]);
  
  const fetchSuites = useCallback(async () => {
    if (!projectFileName) {
        setTestSuites([]);
        return;
    }
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
        setTestSuites([]);
        setSuiteLoadError(e.message || 'An unknown error occurred.');
    } finally {
        setIsLoadingSuites(false);
    }
  }, [projectFileName]);

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
  
    try {
      const runResponse = await fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runType, config: runConfig }),
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
              data.videoFile || null
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
      saveRunToHistory(suiteName, 'Failed', duration, 0, 1, null, null, null);
      toast({
        variant: "destructive",
        title: toastTitle,
        description: toastDescription,
      });
    }
  }, [addLog, getSuiteNameForRun, runConfig, saveRunToHistory, toast]);

  const handleStop = useCallback(async () => {
    addLog('Attempting to stop execution...');
    try {
        const response = await fetch('/api/stop-tests', { method: 'POST' });
        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }
        const result = await response.json();
        addLog(result.message);
        // The polling interval will handle the status change to "stopped"
        // setStatus('stopped'); // No need to set it here
        toast({
            title: "Stop Signal Sent",
            description: "The test run will be terminated.",
        });

    } catch (e) {
        addLog('Failed to send stop signal. It may have already completed.');
        setStatus('failed');
        toast({
            variant: "destructive",
            title: "Stop Failed",
            description: "Could not stop the test run. Check the backend server.",
        });
    }
  }, [addLog, toast]);

  const parseAndSetDataFile = useCallback(async (fileContent: ArrayBuffer | string, fileName: string) => {
    try {
      let data: any[][] = [];
      let headers: string[] = [];

      if (fileName.endsWith('.csv')) {
        const textContent = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent);
        const result = Papa.parse(textContent, {
          header: true,
          skipEmptyLines: true,
        });
        headers = result.meta.fields || [];
        data = result.data.map((row: any) => headers.map(h => row[h]));
      } else if (fileName.endsWith('.xlsx')) {
        if (typeof fileContent === 'string') throw new Error("XLSX parsing requires ArrayBuffer");
        const wb = XLSX.read(fileContent, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (jsonData.length > 0) {
          headers = jsonData[0].map(String);
          data = jsonData.slice(1);
        }
      }
      setEditedHeaders(headers);
      setEditedData(data);

    } catch (e) {
      console.error("Error parsing data file", e);
      toast({ variant: 'destructive', title: "Error reading data file" });
    }
  }, [toast]);

  const handleDataFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      clearDataFile();
      return;
    }

    const allowedDataTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    ];
     if (!allowedDataTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        toast({
            variant: "destructive",
            title: 'Invalid File Type',
            description: `Only .csv and .xlsx files are supported for data orchestration.`,
            action: <FileWarning/>,
        });
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
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      toast({ variant: 'destructive', title: "Could not read data file", description: errorMessage });
      clearDataFile();
    }
  }, [clearDataFile, parseAndSetDataFile, toast]);

  const handleProjectFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
  
    const firstPath = files[0].webkitRelativePath;
    const projectName = firstPath.split('/')[0] || 'Uploaded Project';
    
    clearProjectFile();
    setProjectFileName(projectName);
    setProjectFileSource('local');
  
    try {
      const formData = new FormData();
      let requirementsFile: File | null = null;
      let dataFile: File | null = null;

      for (const file of Array.from(files)) {
        formData.append('files', file, file.webkitRelativePath);
        if (file.name.toLowerCase() === 'requirements.txt') {
          requirementsFile = file;
        }
        if ((file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx')) && !dataFileName) {
            dataFile = file;
        }
      }
  
      if (requirementsFile) {
        const content = await readFileAsText(requirementsFile);
        setRequirementsContent(content);
      } else {
        toast({ title: 'Info', description: `requirements.txt not found in the project.` });
      }

      if (dataFile) {
        await handleDataFileUpload(dataFile);
      }
  
      // This is a placeholder for actual folder upload to backend.
      // In a real scenario, you'd send formData to the backend.
      // For this app, we assume the backend has the folder.
      toast({
        title: 'Project Loaded',
        description: `${projectName} is now the active project.`,
        action: <FileCheck2 className="text-green-500" />,
      });
  
      await fetchSuites();
  
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error processing project folder',
        description: error.message || 'Could not process the selected folder. Please try again.',
      });
      clearProjectFile();
    }
  }, [clearProjectFile, toast, fetchSuites, dataFileName, handleDataFileUpload]);

  const handleGitImport = useCallback((url: string) => {
    if (!url) {
        toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please enter a valid Git repository URL.'});
        return;
    }

    const repoName = url.split('/').pop()?.replace('.git', '') || 'Git Project';
    
    clearProjectFile();
    setProjectFileName(repoName);
    setProjectFileSource('git');

    const dummyReqs = 'robotframework\nrequests\nselenium';
    const dummyCsv = 'id,priority,testcase\n1,high,User can login';

    setRequirementsContent(dummyReqs);
    setDataFileName('data.csv');
    parseAndSetDataFile(dummyCsv, 'data.csv');

    toast({
        title: 'Project Imported',
        description: `Simulated import of "${repoName}".`,
        action: <GitBranch className="text-primary" />,
    });
    fetchSuites();
  }, [toast, parseAndSetDataFile, clearProjectFile, fetchSuites]);

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
    projectFileSource,
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
    handleGitImport,
    clearProjectFile,
    handleDataFileUpload,
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

    