
"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectManagementPage() {

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Project Upload</CardTitle>
          <CardDescription>
            Upload your entire Robot Framework project as a single .zip file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectUpload />
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

    