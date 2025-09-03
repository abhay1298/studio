
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { GitCloneForm } from "@/components/dashboard/git-clone-form";
import { Separator } from "@/components/ui/separator";

export default function ProjectManagementPage() {

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Load Project from Local</CardTitle>
            <CardDescription>
              Upload your Robot Framework project as a single `.zip` file, or provide your `.csv` or `.xlsx` test data file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectUpload />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Clone from Git Repository</CardTitle>
            <CardDescription>
              Provide a public Git repository URL. The system will clone it and set it as the active test directory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GitCloneForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
