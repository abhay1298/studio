"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { analyzeRobotLogs } from "@/ai/flows/analyze-robot-logs-for-root-cause-and-resolution";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";

type AiAnalysisDialogProps = {
  logs: string;
};

export function AiAnalysisDialog({ logs }: AiAnalysisDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await analyzeRobotLogs({ robotLogs: logs });
      setAnalysis(result.analysisResult);
    } catch (e) {
      setError("Failed to get analysis. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset state when opening
      setAnalysis(null);
      setError(null);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4 text-accent" />
          Analyze with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Bot className="text-primary" />
            AI Root Cause Analysis
          </DialogTitle>
          <DialogDescription>
            Let AI analyze the execution logs to find the root cause and suggest
            a resolution.
          </DialogDescription>
        </DialogHeader>

        {!analysis && !isLoading && !error && (
            <div className="py-8 text-center">
                <p className="text-muted-foreground mb-4">Ready to analyze the failed execution logs.</p>
                <Button onClick={handleAnalysis}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Analysis
                </Button>
            </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">AI is thinking...</p>
          </div>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {analysis && (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4 whitespace-pre-wrap font-sans text-sm">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h3 className="font-bold text-green-700 dark:text-green-400 mb-2">Root Cause</h3>
                    <p>The test failed because the element with locator <code className="font-code bg-muted px-1 py-0.5 rounded-sm">'//button[@id="submit-payment-flaky"]'</code> was not found on the page within the 5-second timeout.</p>
                </div>

                <Separator />
                
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2">Suggested Resolutions</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Verify Locator:</strong> Double-check if the element locator is correct and unique. It might have changed due to a recent UI update.</li>
                        <li><strong>Increase Timeout:</strong> The page or element might be loading slowly. Try increasing the default timeout for keyword <code className="font-code bg-muted px-1 py-0.5 rounded-sm">Wait Until Element Is Visible</code>.</li>
                        <li><strong>Add Wait Strategy:</strong> Before interacting with the element, add an explicit wait, like <code className="font-code bg-muted px-1 py-0.5 rounded-sm">Wait Until Page Contains Element</code>, to ensure it is fully rendered and interactable.</li>
                        <li><strong>Check for Dynamic IDs:</strong> The ID <code className="font-code bg-muted px-1 py-0.5 rounded-sm">'submit-payment-flaky'</code> might be dynamic. Consider using a more stable locator strategy, such as one based on <code className="font-code bg-muted px-1 py-0.5 rounded-sm">data-testid</code> attributes.</li>
                    </ul>
                </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
