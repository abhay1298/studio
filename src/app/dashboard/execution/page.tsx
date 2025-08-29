
"use client";

import { ExecutionPanel } from '@/components/dashboard/execution-panel';
import { useState } from 'react';

export default function ExecutionPage() {
  const [isDataFileUploaded, setIsDataFileUploaded] = useState(false);

  // This is a bit of a workaround to check for the session storage item
  // and update the state accordingly.
  if (typeof window !== 'undefined') {
    const file = sessionStorage.getItem('uploadedDataFile');
    if (file && !isDataFileUploaded) {
      setIsDataFileUploaded(true);
    } else if (!file && isDataFileUploaded) {
      setIsDataFileUploaded(false);
    }
  }
  
  return (
    <div>
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">
        Test Execution Center
      </h1>
      <ExecutionPanel isDataFileUploaded={isDataFileUploaded} />
    </div>
  );
}
