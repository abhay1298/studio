
"use client";

import React from 'react';
import type { LogEntry as LogEntryType } from '@/lib/log-parser';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, ChevronRight, Info, Settings, TestTube2, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const getStatusIcon = (status: LogEntryType['status']) => {
  switch (status) {
    case 'PASS': return <CheckCircle2 className="text-green-500" />;
    case 'FAIL': return <XCircle className="text-destructive" />;
    case 'INFO': return <Info className="text-blue-500" />;
    case 'WARN': return <AlertCircle className="text-yellow-500" />;
    case 'KEYWORD': return <Settings className="text-gray-500" />;
    default: return <ChevronRight />;
  }
};

const getStatusBadgeVariant = (status: LogEntryType['status']) => {
    switch(status) {
        case 'PASS': return 'default';
        case 'FAIL': return 'destructive';
        case 'WARN': return 'secondary';
        default: return 'outline';
    }
};

const getStatusBadgeClass = (status: LogEntryType['status']) => {
    switch(status) {
        case 'PASS': return 'border-transparent bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400';
        default: return '';
    }
}

const LogEntry: React.FC<{ entry: LogEntryType }> = ({ entry }) => {
  const hasChildren = entry.children.length > 0;
  
  const trigger = (
    <div className="flex items-center gap-3 w-full font-mono text-sm py-2">
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
             {getStatusIcon(entry.status)}
        </div>
        <div className="flex-grow flex items-center gap-2 truncate">
           <span className="truncate">{entry.text}</span>
            {entry.duration && (
                <span className="text-xs text-muted-foreground font-sans">({entry.duration})</span>
            )}
        </div>
        <div className="flex-shrink-0">
             {entry.status !== 'INFO' && entry.status !== 'KEYWORD' && (
                <Badge variant={getStatusBadgeVariant(entry.status)} className={cn('uppercase', getStatusBadgeClass(entry.status))}>
                  {entry.status}
                </Badge>
            )}
        </div>
    </div>
  );

  if (!hasChildren) {
    return <div className="pl-4 border-l border-dashed border-muted-foreground/20 ml-[9px]">{trigger}</div>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={entry.text} className="border-b-0">
        <AccordionTrigger className="hover:no-underline hover:bg-muted/50 rounded-md px-2 -ml-2">
            {trigger}
        </AccordionTrigger>
        <AccordionContent className="pl-6 border-l border-dashed border-muted-foreground/50 ml-[9px]">
          {entry.children.map((child, index) => (
            <LogEntry key={index} entry={child} />
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export const LogViewer: React.FC<{ entries: LogEntryType[] }> = ({ entries }) => {
  if (entries.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No log entries to display.</div>;
  }

  return (
    <TooltipProvider>
        <div className="flex flex-col">
        {entries.map((entry, index) => (
            <LogEntry key={index} entry={entry} />
        ))}
        </div>
    </TooltipProvider>
  );
};
