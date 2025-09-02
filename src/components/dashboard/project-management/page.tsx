
"use client";

import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { TestDirectoryConfigurator } from "@/components/dashboard/test-directory-configurator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectManagementPage() {

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Configuration
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Test Directory Configuration</CardTitle>
          <CardDescription>
            Configure the connection to your local Robot Framework project. The server will attempt to auto-discover directories containing `.robot` files.
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
