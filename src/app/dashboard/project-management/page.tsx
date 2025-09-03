
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FolderGit } from "lucide-react";

export default function ProjectManagementPage() {

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      
      <Alert>
        <FolderGit className="h-4 w-4" />
        <AlertTitle>Project Management Hub</AlertTitle>
        <AlertDescription>
          This area is designated for future project configuration and management tools.
        </AlertDescription>
      </Alert>
    </div>
  );
}
