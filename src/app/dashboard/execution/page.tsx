
"use client";

import { ExecutionPanel } from '@/components/dashboard/execution-panel';
import { useState } from 'react';

export default function ExecutionPage() {
  const [isDataFileUploaded, setIsDataFileUploaded] = useState(false);
  
  return (
    <div>
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">
        Test Execution Center
      </h1>
      <ExecutionPanel isOrchestratorFileUploaded={isDataFileUploaded} />
    </div>
  );
}
