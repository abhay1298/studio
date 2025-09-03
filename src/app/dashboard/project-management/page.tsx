
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectUpload } from "@/components/dashboard/project-upload";

export default function ProjectManagementPage() {

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      
      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Test Data Upload</CardTitle>
            <CardDescription>
              Upload your CSV or Excel file here. The data will be available
              in the Data Editor and can be used by the Orchestrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectUpload />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
