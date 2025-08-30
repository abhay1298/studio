
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileCode, Loader2, PackageSearch, TestTube2, ServerIcon } from "lucide-react";

export type TestSuite = {
  name: string;
  testCases: string[];
};

type ProjectExplorerProps = {
  suites: TestSuite[];
  isLoading: boolean;
};

export function ProjectExplorer({ suites, isLoading }: ProjectExplorerProps) {

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Loading project structure from backend...</p>
        </div>
    );
  }

  if (suites.length === 0) {
      return (
        <Alert>
            <ServerIcon className="h-4 w-4" />
            <AlertTitle>No Test Suites Found</AlertTitle>
            <AlertDescription>
              The backend server did not find any `.robot` files containing test cases in the configured directory. Please check your `server.py` configuration and test files.
            </AlertDescription>
        </Alert>
      );
  }


  return (
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
  );
}
