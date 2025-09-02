
"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, XCircle, StopCircle, Loader2, FolderCheck, UploadCloud, AlertTriangle } from 'lucide-react';
import type { TestSuite } from '@/components/dashboard/project-explorer';
import type { DependencyScanResult } from '@/components/dashboard/dependency-checker';
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
type MissingPackage = { name: string; required_spec: string; source_file: string; raw_line: string };
type ProjectFileSource = 'local' | 'git' | null;

export type DirectoryStatus = {
  configured: boolean;
  directory?: string;
  robot_file_count?: number;
  message?: string;
};

export type DiscoveredDirectory = {
  path: string;
  relative_path: string;
  robot_count: number;
  depth: number;
}

interface ExecutionContextType {
  status: ExecutionStatus;
  logs: string[];
  lastFailedLogs: string;
  runConfig: RunConfig;
  
  projectFileName: string | null;
  projectFileSource: ProjectFileSource;
  isUploadingProject: boolean;

  dataFileName: string | null;
  
  dependencyScanResult: DependencyScanResult | null;
  isScanningDependencies: boolean;
  isInstallingDependencies: boolean;
  scanError: string | null;

  testSuites: TestSuite[];
  isLoadingSuites: boolean;
  suiteLoadError: string | null;

  directoryStatus: DirectoryStatus | null;
  discoveredDirectories: DiscoveredDirectory[] | null;
  isDiscovering: boolean;
  isSettingDirectory: boolean;

  editedData: TableData;
  setEditedData: Dispatch<SetStateAction<TableData>>;
  editedHeaders: string[];
  setEditedHeaders: Dispatch<SetStateAction<string[]>>;
  hasHydrated: boolean;

  fetchSuites: () => Promise<void>;
  fetchDirectoryStatus: () => Promise<void>;
  discoverDirectories: () => Promise<void>;
  setTestDirectory: (path: string) => Promise<void>;

  handleInputChange: (field: keyof RunConfig, value: string) => void;
  handleRun: (runType: string) => Promise<void>;
  handleStop: () => Promise<void>;
  clearLogs: () => void;

  handleProjectFileUpload: (files: FileList) => Promise<void>;
  clearProjectFile: () => void;
  handleDataFileUpload: (file: File | null) => void;
  clearDataFile: () => void;

  scanDependencies: () => void;
  installDependencies: (packages: MissingPackage[]) => void;
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

  const [projectFileName, setProjectFileName] = useState<string | null>(null);
  const [projectFileSource, setProjectFileSource] = useState<ProjectFileSource>(null);
  const [isUploadingProject, setIsUploadingProject] = useState(false);

  const [dataFileName, setDataFileName] = useState<string | null>(null);
  
  const [dependencyScanResult, setDependencyScanResult] = useState<DependencyScanResult | null>(null);
  const [isScanningDependencies, setIsScanningDependencies] = useState(false);
  const [isInstallingDependencies, setIsInstallingDependencies] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoadingSuites, setIsLoadingSuites] = useState(false);
  const [suiteLoadError, setSuiteLoadError] = useState<string | null>(null);

  const [directoryStatus, setDirectoryStatus] = useState<DirectoryStatus | null>(null);
  const [discoveredDirectories, setDiscoveredDirectories] = useState<DiscoveredDirectory[] | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSettingDirectory, setIsSettingDirectory] = useState(false);

  const [editedData, setEditedData] = useState<TableData>([]);
  const [editedHeaders, setEditedHeaders] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  const { toast } = useToast();
  
  const fetchSuites = useCallback(async () => {
    setIsLoadingSuites(true);
    setSuiteLoadError(null);
    try {
        const response = await fetch('/api/list-suites');
        
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `Failed to fetch suites. Status: ${response.status}`;
            } catch (e) {
                errorMessage = await response.text();
                if (!errorMessage) {
                    errorMessage = `Failed to fetch suites from the backend. Status: ${response.status}`;
                }
            }
            throw new Error(errorMessage);
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
  }, []);

  const fetchDirectoryStatus = useCallback(async () => {
    try {
        const response = await fetch('/api/test-directory-status');
        const data: DirectoryStatus = await response.json();
        setDirectoryStatus(data);
        if (data.configured) {
            fetchSuites();
        } else {
            setTestSuites([]);
        }
    } catch (e) {
        setDirectoryStatus({
            configured: false,
            message: 'Failed to connect to the backend server to get directory status.'
        })
    }
  }, [fetchSuites]);

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
    setProjectFileName(getInitialState('projectFileName', null));
    setProjectFileSource(getInitialState('projectFileSource', null));
    setDataFileName(getInitialState('dataFileName', null));
    setEditedData(getInitialState('editedData', []));
    setEditedHeaders(getInitialState('editedHeaders', []));
    setDependencyScanResult(getInitialState('dependencyScanResult', null));
    setHasHydrated(true);

    fetchDirectoryStatus();
  }, [fetchDirectoryStatus]);

  useEffect(() => {
    if (hasHydrated) {
        try {
            localStorage.setItem('projectFileName', JSON.stringify(projectFileName));
            localStorage.setItem('projectFileSource', JSON.stringify(projectFileSource));
            localStorage.setItem('dataFileName', JSON.stringify(dataFileName));
            localStorage.setItem('editedData', JSON.stringify(editedData));
            localStorage.setItem('editedHeaders', JSON.stringify(editedHeaders));
            localStorage.setItem('dependencyScanResult', JSON.stringify(dependencyScanResult));
        } catch (error) {
            console.warn(`Error writing to localStorage:`, error);
        }
    }
  }, [projectFileName, projectFileSource, dataFileName, editedData, editedHeaders, dependencyScanResult, hasHydrated]);
  
  const clearProjectFile = useCallback(() => {
    setProjectFileName(null);
    setProjectFileSource(null);
  }, []);

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

  const handleProjectFileUpload = useCallback(async (files: FileList) => {
    setIsUploadingProject(true);
    toast({ title: 'Uploading Project...', description: 'Please wait...', action: <Loader2 className="animate-spin" /> });
    
    try {
        if (!files || files.length === 0) {
            throw new Error("No files selected for upload.");
        }

        const formData = new FormData();
        let dataFileFound: File | null = null;
        const projectRootName = files[0].webkitRelativePath.split('/')[0];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            formData.append('files', file);
            formData.append('relativePaths', file.webkitRelativePath);
            
            if (!dataFileFound && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
              dataFileFound = file;
            }
        }
        
        const response = await fetch('/api/upload-project', { method: 'POST', body: formData });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload project to backend.');
        }
        
        setProjectFileName(projectRootName);
        setProjectFileSource('local');
        toast({ title: "Project Uploaded", description: `"${projectRootName}" is now the active project.`, action: <UploadCloud className="text-primary"/> });

        await fetchDirectoryStatus(); 

        if (dataFileFound) {
          toast({ title: "Data File Found!", description: `Automatically loaded "${dataFileFound.name}" from your project.`, action: <FileCheck2 className="text-green-500" /> });
          await handleDataFileUpload(dataFileFound);
        }

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Project Upload Failed', description: error.message });
        clearProjectFile();
    } finally {
        setIsUploadingProject(false);
    }
  }, [toast, fetchDirectoryStatus, handleDataFileUpload, clearProjectFile]);


  const scanDependencies = useCallback(async () => {
    if (!directoryStatus?.configured) {
        toast({ variant: 'destructive', title: 'Cannot Scan', description: 'An active test directory must be configured first.' });
        return;
    }
    setIsScanningDependencies(true);
    setScanError(null);
    setDependencyScanResult(null);
    try {
      const response = await fetch('/api/scan-dependencies');
      const result: DependencyScanResult = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.errors?.[0] || 'Failed to scan dependencies on the backend.');
      }
      setDependencyScanResult(result);
      
    } catch (error: any) {
      setScanError(error.message || 'Could not connect to the dependency scanner service.');
    } finally {
      setIsScanningDependencies(false);
    }
  }, [directoryStatus, toast]);
  
  const installDependencies = useCallback((packages: MissingPackage[]) => {
    if (!packages || packages.length === 0) return;
    
    setIsInstallingDependencies(true);
    let pollingInterval: NodeJS.Timeout;

    const startInstallation = async () => {
        try {
            const response = await fetch('/api/install-dependencies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ missing_packages: packages }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to start installation');

            pollingInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch('/api/status');
                    const statusData = await statusRes.json();
                    if (statusData.logs) {
                        setLogs(statusData.logs);
                    }
                    if (statusData.status !== 'running') {
                        clearInterval(pollingInterval);
                        setIsInstallingDependencies(false);
                        if (statusData.status === 'success') {
                            toast({
                                title: 'Installation Complete',
                                description: 'All missing packages have been installed. Please scan again to verify.',
                                action: <CheckCircle2 className="text-green-500" />
                            });
                            await scanDependencies();
                        } else {
                            toast({
                                variant: 'destructive',
                                title: 'Installation Failed',
                                description: 'Check the execution logs for more details.',
                            });
                        }
                    }
                } catch (pollError) {
                  console.error('Polling error:', pollError);
                  clearInterval(pollingInterval);
                  setIsInstallingDependencies(false);
                  toast({ variant: 'destructive', title: 'Connection Error', description: 'Lost connection to the backend during installation.' });
                }
            }, 2000);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Installation Error', description: e.message });
            setIsInstallingDependencies(false);
        }
    };

    toast({
        title: 'Starting Installation...',
        description: `Attempting to install ${packages.length} package(s).`,
        action: <Loader2 className="animate-spin" />,
    });

    startInstallation();

  }, [toast, scanDependencies]);

  const discoverDirectories = useCallback(async () => {
    setIsDiscovering(true);
    setDiscoveredDirectories(null);
    try {
        const response = await fetch('/api/discover-test-directories');
        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to discover directories from backend.');
        }
        setDiscoveredDirectories(data.directories);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Discovery Failed', description: e.message });
    } finally {
        setIsDiscovering(false);
    }
  }, [toast]);

  const setTestDirectory = useCallback(async (path: string) => {
    setIsSettingDirectory(true);
    try {
        const response = await fetch('/api/set-test-directory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directory: path }),
        });
        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to set test directory on backend.');
        }
        toast({
            title: 'Directory Configured',
            description: `Active test directory has been set.`,
            action: <FolderCheck className="text-green-500" />
        });
        await fetchDirectoryStatus();
        setDiscoveredDirectories(null); // Close the discovery dialog
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Configuration Failed', description: e.message });
    } finally {
        setIsSettingDirectory(false);
    }
  }, [toast, fetchDirectoryStatus]);


  const value = {
    status,
    logs,
    lastFailedLogs,
    runConfig,
    projectFileName,
    projectFileSource,
    isUploadingProject,
    dataFileName,
    dependencyScanResult,
    isScanningDependencies,
    isInstallingDependencies,
    scanError,
    testSuites,
    isLoadingSuites,
    suiteLoadError,
    directoryStatus,
    discoveredDirectories,
    isDiscovering,
    isSettingDirectory,
    editedData,
    setEditedData,
    editedHeaders,
    setEditedHeaders,
    hasHydrated,
    fetchSuites,
    fetchDirectoryStatus,
    discoverDirectories,
    setTestDirectory,
    handleInputChange,
    handleRun,
    handleStop,
    clearLogs,
    handleProjectFileUpload,
    clearProjectFile,
    handleDataFileUpload,
    clearDataFile,
    scanDependencies,
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

    