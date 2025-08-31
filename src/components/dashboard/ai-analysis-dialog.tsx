
"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (isOpen) {
      // Reset state when opening and auto-start analysis
      setAnalysis(null);
      setError(null);
      setIsLoading(false);
      handleAnalysis();
    }
  }, [isOpen]);


  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!logs}>
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
            <div className="space-y-4 whitespace-pre-wrap font-sans text-sm p-4 bg-muted/50 rounded-lg">
              {analysis}
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
