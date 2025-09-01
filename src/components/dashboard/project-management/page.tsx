
"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useExecutionContext } from "@/contexts/execution-context";

export default function ProjectManagementPage() {
  const { 
    projectFileName,
    projectFileSource,
    dataFileName,
    handleProjectFileUpload,
    handleDataFileUpload,
    clearProjectFile,
    clearDataFile,
  } = useExecutionContext();

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      <ProjectUpload 
        projectFileName={projectFileName}
        projectFileSource={projectFileSource}
        dataFileName={dataFileName}
        onProjectFileChange={handleProjectFileUpload}
        onDataFileChange={handleDataFileUpload}
        onClearProjectFile={clearProjectFile}
        onClearDataFile={clearDataFile}
      />
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Dependency Management</CardTitle>
            <CardDescription>Scan your project to find and install required Python packages from `requirements.txt` files.</CardDescription>
        </CardHeader>
        <CardContent>
            <DependencyChecker projectIsLoaded={!!projectFileName}/>
        </CardContent>
      </Card>
    </div>
  );
}
