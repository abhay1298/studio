
"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { TestDirectoryConfigurator } from "@/components/dashboard/test-directory-configurator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useExecutionContext } from "@/contexts/execution-context";

export default function ProjectManagementPage() {
  const { 
    dataFileName,
    handleDataFileUpload,
    clearDataFile,
    handleProjectFileUpload,
    clearProjectFile,
    projectFileName,
    projectFileSource,
  } = useExecutionContext();

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      
      <ProjectUpload 
        onProjectFileChange={handleProjectFileUpload}
        onDataFileChange={handleDataFileUpload}
        onClearProjectFile={clearProjectFile}
        onClearDataFile={clearDataFile}
        projectFileName={projectFileName}
        projectFileSource={projectFileSource}
        dataFileName={dataFileName}
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Test Directory Configuration</CardTitle>
          <CardDescription>
            Verify the active test directory on the backend server. Use the "Discover" button to switch between different test folders within your uploaded project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestDirectoryConfigurator />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Dependency Management</CardTitle>
            <CardDescription>Scan your configured project to find and install required Python packages from `requirements.txt` files.</CardDescription>
        </CardHeader>
        <CardContent>
            <DependencyChecker />
        </CardContent>
      </Card>
    </div>
  );
}
