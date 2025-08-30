
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ProjectUpload } from '@/components/dashboard/project-upload';
import { DependencyChecker } from '@/components/dashboard/dependency-checker';
import { ProjectExplorer as ProjectExplorerComponent, TestSuite } from '@/components/dashboard/project-explorer';
import JSZip from 'jszip';

const PROJECT_FILE_KEY = 'uploadedProjectFile';
const PROJECT_FILE_NAME_KEY = 'uploadedProjectFileName';
const TEST_SUITES_KEY = 'parsedTestSuites';

export default function ProjectExplorerPage() {
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const parseRobotFile = (content: string): string[] => {
    const testCases: string[] = [];
    const lines = content.split(/\r?\n/);
    let inTestCasesSection = false;
    for (const line of lines) {
        if (line.trim().toLowerCase() === '*** test cases ***') {
            inTestCasesSection = true;
            continue;
        }
        if (line.trim().startsWith('***')) {
            inTestCasesSection = false;
        }
        if (inTestCasesSection && line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('#')) {
            testCases.push(line.trim());
        }
    }
    return testCases;
  };
  
  const parseProjectData = useCallback(async (projectData: File | Blob) => {
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

  const handleProjectFileChange = async (file: File | null) => {
    setProjectFile(file);
    window.dispatchEvent(new CustomEvent('projectUpdated'));

    if (!file) {
        setTestSuites([]);
        sessionStorage.removeItem(PROJECT_FILE_KEY);
        sessionStorage.removeItem(PROJECT_FILE_NAME_KEY);
        sessionStorage.removeItem(TEST_SUITES_KEY);
        return;
    }

    await parseProjectData(file);
  };


  useEffect(() => {
    setIsLoading(true);
    const storedFileName = sessionStorage.getItem(PROJECT_FILE_NAME_KEY);
    const storedFileContent = sessionStorage.getItem(PROJECT_FILE_KEY);

    if (storedFileName) {
        const dummyFile = new File([], storedFileName, { type: 'application/zip' });
        setProjectFile(dummyFile);
    }

    const storedSuites = sessionStorage.getItem(TEST_SUITES_KEY);
    if (storedSuites) {
        try {
            setTestSuites(JSON.parse(storedSuites));
        } catch (e) {
            console.error("Failed to parse stored suites", e);
            sessionStorage.removeItem(TEST_SUITES_KEY);
        }
    } else if (storedFileContent) {
        // If suites aren't cached, but the file is, parse it.
        fetch(storedFileContent)
            .then(res => res.blob())
            .then(blob => {
                parseProjectData(blob);
            });
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
                <ProjectUpload onProjectFileChange={handleProjectFileChange} projectFile={projectFile} />
                <DependencyChecker projectFile={projectFile} />
            </div>
            <div className="lg:col-span-2">
                <ProjectExplorerComponent suites={testSuites} isLoading={isParsing || isLoading} />
            </div>
        </div>
    </div>
  );
}
