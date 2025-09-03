
"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { GitCloneForm } from "@/components/dashboard/git-clone-form";
import { ProjectUploadForm } from "@/components/dashboard/project-upload-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, FolderUp, GitBranch } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProjectManagementPage() {

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Load Project</CardTitle>
                <CardDescription>Choose a local project folder or import from a Git repository.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="local" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local">
                            <FolderUp className="mr-2 h-4 w-4" />
                            Local Folder
                        </TabsTrigger>
                        <TabsTrigger value="git">
                            <GitBranch className="mr-2 h-4 w-4" />
                            Git Repository
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="local" className="pt-4">
                       <ProjectUploadForm />
                    </TabsContent>
                    <TabsContent value="git" className="pt-4">
                        <GitCloneForm />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Orchestrator Data</CardTitle>
                <CardDescription>Upload and manage the Excel or CSV file for orchestrator runs.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-medium mb-2">Test Data File (.xlsx, .csv)</p>
                <Alert>
                    <Link href="/dashboard/data-editor" className="h-4 w-4" />
                    <AlertTitle>Upload in Data Editor</AlertTitle>
                    <AlertDescription>
                        Data file management has been moved. Please use the <Link href="/dashboard/data-editor" className="font-semibold text-primary hover:underline">Data Editor</Link> page to upload and manage your test data files.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      </div>

      <DependencyChecker />

    </div>
  );
}
