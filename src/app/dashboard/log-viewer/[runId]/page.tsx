
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LogViewer } from '@/components/dashboard/log-viewer';
import type { LogEntry } from '@/lib/log-parser';
import { parseRobotLogs } from '@/lib/log-parser';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ServerCrash, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LogViewerPage() {
    const params = useParams();
    const router = useRouter();
    const runId = params.runId as string;

    const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [runDetails, setRunDetails] = useState<{ suite: string; date: string; } | null>(null);

    useEffect(() => {
        if (!runId || typeof window === 'undefined') return;

        setIsLoading(true);
        setError(null);
        try {
            const history = localStorage.getItem('robotMaestroRuns');
            if (!history) {
                throw new Error("No run history found in local storage.");
            }
            const runs = JSON.parse(history);
            const currentRun = runs.find((r: any) => r.id === runId);

            if (!currentRun) {
                throw new Error(`Could not find a run with ID: ${runId}`);
            }

            const rawLogs = currentRun.rawLogs || [];
            if (rawLogs.length === 0) {
                 throw new Error("No raw logs were saved for this run. Cannot display log viewer.");
            }
            
            const parsedLogs = parseRobotLogs(rawLogs);
            setLogEntries(parsedLogs);
            setRunDetails({ suite: currentRun.suite, date: new Date(currentRun.date).toLocaleString() });

        } catch (e: any) {
            setError(e.message || "An unknown error occurred while loading logs.");
        } finally {
            setIsLoading(false);
        }

    }, [runId]);

    const content = useMemo(() => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center gap-4 text-muted-foreground py-16">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-lg">Parsing logs...</p>
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Could Not Load Logs</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }

        return <LogViewer entries={logEntries} />;

    }, [isLoading, error, logEntries]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                 </Button>
                <div className="flex-1">
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                        Interactive Log Viewer
                    </h1>
                     {runDetails && (
                        <p className="text-muted-foreground">
                            Displaying logs for run: <strong>{runDetails.suite}</strong> ({runDetails.date})
                        </p>
                    )}
                </div>
            </div>
            
            <Card>
                <CardContent className="p-2 sm:p-4 md:p-6">
                    {content}
                </CardContent>
            </Card>
        </div>
    );
}
