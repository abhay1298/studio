

"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useExecutionContext } from "@/contexts/execution-context";

export default function ProjectManagementPage() {
  const { 
    dataFileName,
    handleDataFileUpload,
    clearDataFile,
  } = useExecutionContext();

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">File Upload</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file for data-driven testing with the Orchestrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectUpload 
            onFileChange={handleDataFileUpload}
            onClear={clearDataFile}
            fileName={dataFileName}
          />
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
