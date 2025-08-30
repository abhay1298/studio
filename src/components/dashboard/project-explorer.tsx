
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileCode, Loader2, PackageSearch, TestTube2 } from "lucide-react";

export type TestSuite = {
  name: string;
  testCases: string[];
};

type ProjectExplorerProps = {
  suites: TestSuite[];
  isLoading: boolean;
  projectLoaded: boolean;
};

export function ProjectExplorer({ suites, isLoading, projectLoaded }: ProjectExplorerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Project Explorer</CardTitle>
        <CardDescription>
          View the test suites and test cases found in your uploaded project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Parsing project files...</p>
          </div>
        ) : projectLoaded && suites.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {suites.map((suite, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="font-mono text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-primary" />
                    <span>{suite.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="pl-6 space-y-2 pt-2">
                    {suite.testCases.map((testCase, tcIndex) => (
                      <li key={tcIndex} className="flex items-center gap-2 text-muted-foreground">
                        <TestTube2 className="h-4 w-4 text-accent" />
                        <span className="text-sm">{testCase}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Alert>
            <PackageSearch className="h-4 w-4" />
            <AlertTitle>No Project Loaded</AlertTitle>
            <AlertDescription>
              Use the controls on the left to upload a project zip file or import from a Git repository to see its contents here.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
