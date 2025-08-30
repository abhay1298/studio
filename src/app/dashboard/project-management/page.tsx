
"use client";

import { useState, useEffect } from "react";
import { DependencyChecker } from "@/components/dashboard/dependency-checker";
import { ProjectUpload } from "@/components/dashboard/project-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import JSZip from 'jszip';
import { useToast } from "@/hooks/use-toast";


export default function ProjectManagementPage() {
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [requirementsContent, setRequirementsContent] = useState<string | null>(null);
  const { toast } = useToast();

   useEffect(() => {
    // Restore file state from sessionStorage on component mount
    const storedProjectFileName = sessionStorage.getItem('uploadedProjectFileName');
     if (storedProjectFileName) {
        // We create a dummy file object because we don't have the content,
        // but this is enough to show the user which file is "active".
        // The actual parsing logic will handle fetching content if needed.
        const dummyProjectFile = new File([], storedProjectFileName, { type: 'application/zip' });
        setProjectFile(dummyProjectFile);
        // Also try to restore requirements content
        const storedReqs = sessionStorage.getItem('requirementsContent');
        if (storedReqs) {
            setRequirementsContent(storedReqs);
        }
    }
  }, []);

  const handleProjectFileChange = async (file: File | null) => {
    setProjectFile(file);
    if (!file) {
      setRequirementsContent(null);
      sessionStorage.removeItem('uploadedProjectFileName');
      sessionStorage.removeItem('requirementsContent');
      return;
    }

    sessionStorage.setItem('uploadedProjectFileName', file.name);

    try {
      const zip = await JSZip.loadAsync(file);
      const reqFile = zip.file('requirements.txt');
      if (reqFile) {
        const content = await reqFile.async('string');
        setRequirementsContent(content);
        sessionStorage.setItem('requirementsContent', content);
      } else {
        setRequirementsContent(null);
        sessionStorage.removeItem('requirementsContent');
        toast({
            variant: 'default',
            title: 'No requirements.txt found',
            description: "The uploaded project does not contain a requirements.txt file.",
        });
      }
    } catch (error) {
      console.error("Error reading zip file:", error);
      toast({
        variant: 'destructive',
        title: 'Error processing project',
        description: 'Could not read the contents of the uploaded zip file.',
      });
      setRequirementsContent(null);
      sessionStorage.removeItem('requirementsContent');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Project Management
      </h1>
      <ProjectUpload 
        onProjectFileChange={handleProjectFileChange} 
        initialProjectFile={projectFile}
      />
      <Card>
        <CardHeader>
            <CardTitle>Dependency Management</CardTitle>
            <CardDescription>Scan the `requirements.txt` from your uploaded project to see if the required Python libraries are installed in the backend environment.</CardDescription>
        </CardHeader>
        <CardContent>
            <DependencyChecker requirementsContent={requirementsContent} projectIsLoaded={!!projectFile}/>
        </CardContent>
      </Card>
    </div>
  );
}
