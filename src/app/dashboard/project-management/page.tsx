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
      <ProjectUpload />
      <Card>
        <CardHeader>
            <CardTitle>Dependency Management</CardTitle>
            <CardDescription>This is a simulation. In a real app, this would scan your backend environment for required Python libraries.</CardDescription>
        </CardHeader>
        <CardContent>
            <DependencyChecker projectFile={null} />
        </CardContent>
      </Card>

    </div>
  );
}
