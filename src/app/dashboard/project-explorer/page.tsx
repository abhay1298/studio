
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ProjectUpload } from '@/components/dashboard/project-upload';
import { DependencyChecker } from '@/components/dashboard/dependency-checker';
import { ProjectExplorer as ProjectExplorerComponent, TestSuite } from '@/components/dashboard/project-explorer';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileCheck2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';


const PROJECT_FILE_CONTENT_KEY = 'uploadedProjectFileContent'; // Renamed for clarity
const PROJECT_FILE_NAME_KEY = 'uploadedProjectFileName';
const TEST_SUITES_KEY = 'parsedTestSuites';

export default function ProjectExplorerPage() {
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const parseRobotFile = (content: string): string[] => {
    const testCases: string[] = [];
    const lines = content.split(/\r?\n/);
    let inTestCasesSection = false;
  
    for (const line of lines) {
      const trimmedLine = line.trim();
  
      // Check for section headers
      if (trimmedLine.startsWith('***')) {
        inTestCasesSection = trimmedLine.toLowerCase() === '*** test cases ***';
        continue; // Move to the next line after finding a section header
      }
  
      // If we are in the test cases section and the line is a valid test case definition
      if (inTestCasesSection && trimmedLine) {
        // A valid test case starts with a non-space character and is not a comment.
        // It also does not start with '[', which would be a setting like [Documentation] or [Tags]
        const isIndented = line.startsWith('  ') || line.startsWith('\t');
        if (!isIndented && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('[')) {
          testCases.push(trimmedLine);
        }
      }
    }
    return testCases;
  };
  
  const parseProjectData = useCallback(async (projectData: Blob) => {
    setIsParsing(true);
    try {
        const zip = await JSZip.loadAsync(projectData);
        const suites: TestSuite[] = [];
        const robotFilePromises = Object.keys(zip.files)
            .filter(filename => !zip.files[filename].dir && filename.endsWith('.robot'))
            .map(async (filename) => {
                const fileContent = await zip.files[filename].async('string');
                const testCases = parseRobotFile(fileContent);
                if (testCases.length > 0) {
                    suites.push({ name: filename, testCases });
                }
            });
        
        await Promise.all(robotFilePromises);
        const sortedSuites = suites.sort((a,b) => a.name.localeCompare(b.name));
        setTestSuites(sortedSuites);
        sessionStorage.setItem(TEST_SUITES_KEY, JSON.stringify(sortedSuites));
    } catch (error) {
        console.error("Failed to parse zip file:", error);
        setTestSuites([]);
        sessionStorage.removeItem(TEST_SUITES_KEY);
    } finally {
        setIsParsing(false);
    }
  }, []);

  const clearProject = useCallback(() => {
    setProjectFile(null);
    setTestSuites([]);
    sessionStorage.removeItem(PROJECT_FILE_CONTENT_KEY);
    sessionStorage.removeItem(PROJECT_FILE_NAME_KEY);
    sessionStorage.removeItem(TEST_SUITES_KEY);
    window.dispatchEvent(new CustomEvent('projectUpdated'));
    toast({
        title: 'Project Cleared',
        description: 'The active project has been unloaded.',
    });
  }, [toast]);


  const handleProjectFileChange = async (file: File | null) => {
    if (!file) {
        clearProject();
        return;
    }

    setProjectFile(file);
    sessionStorage.setItem(PROJECT_FILE_NAME_KEY, file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        sessionStorage.setItem(PROJECT_FILE_CONTENT_KEY, dataUrl);
        
        const blob = await (await fetch(dataUrl)).blob();
        await parseProjectData(blob);
        window.dispatchEvent(new CustomEvent('projectUpdated'));
    };
    reader.readAsDataURL(file);
  };


  useEffect(() => {
    setIsLoading(true);
    const storedFileName = sessionStorage.getItem(PROJECT_FILE_NAME_KEY);
    const storedFileContent = sessionStorage.getItem(PROJECT_FILE_CONTENT_KEY);

    if (storedFileName && storedFileContent) {
        // We create a dummy file just for display purposes, the actual content is in the data URL
        const dummyFile = new File([], storedFileName, { type: 'application/zip' });
        setProjectFile(dummyFile);
        
        const storedSuites = sessionStorage.getItem(TEST_SUITES_KEY);
        if (storedSuites) {
            try {
                setTestSuites(JSON.parse(storedSuites));
            } catch (e) {
                console.error("Failed to parse stored suites", e);
                // If parsing fails, re-parse from the stored content
                sessionStorage.removeItem(TEST_SUITES_KEY);
                 fetch(storedFileContent)
                    .then(res => res.blob())
                    .then(blob => {
                        parseProjectData(blob);
                    });
            }
        } else {
             fetch(storedFileContent)
                .then(res => res.blob())
                .then(blob => {
                    parseProjectData(blob);
                });
        }
    } else {
        // If there's no content, ensure everything is cleared.
        setProjectFile(null);
        setTestSuites([]);
    }
    setIsLoading(false);
  }, [parseProjectData]);

  return (
    <div className="space-y-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
            Project Management
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                 <ProjectUpload 
                    onProjectFileChange={handleProjectFileChange} 
                    projectFile={projectFile} 
                 />
                 {projectFile && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Active Project</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
                                <FileCheck2 className="h-4 w-4 !text-green-500" />
                                <AlertTitle className="truncate" title={projectFile.name}>{projectFile.name}</AlertTitle>
                                <AlertDescription>
                                    This project will be used for all executions.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                        <CardFooter>
                             <Button variant="outline" className="w-full" onClick={clearProject}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Clear Active Project
                            </Button>
                        </CardFooter>
                    </Card>
                 )}
                <DependencyChecker projectFile={projectFile} />
            </div>
            <div className="lg:col-span-2">
                <ProjectExplorerComponent suites={testSuites} isLoading={isParsing || isLoading} projectLoaded={!!projectFile} />
            </div>
        </div>
    </div>
  );
}
