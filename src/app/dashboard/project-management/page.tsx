
"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useExecutionContext } from "@/contexts/execution-context";

export default function ProjectManagementPage() {
  const { 
    requirementsContent, 
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
            <CardTitle>Dependency Management</CardTitle>
            <CardDescription>Scan the `requirements.txt` from your uploaded project to see if the required Python libraries are installed in the backend environment.</CardDescription>
        </CardHeader>
        <CardContent>
            <DependencyChecker requirementsContent={requirementsContent} projectIsLoaded={!!projectFileName}/>
        </CardContent>
      </Card>
    </div>
  );
}
