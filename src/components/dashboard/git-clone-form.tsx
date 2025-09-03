
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GitBranch, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExecutionContext } from '@/contexts/execution-context';

export function GitCloneForm() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();
  const { fetchSuites, fetchTestDirectoryStatus } = useExecutionContext();

  const handleClone = async () => {
    if (!repoUrl) {
      setError('Please enter a Git repository URL.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/clone-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      setSuccess(`Successfully cloned repository. Active test directory set to: ${result.path}`);
      setRepoUrl('');
      toast({
        title: 'Repository Cloned',
        description: 'The project is now active and ready for testing.',
        action: <CheckCircle2 className="text-green-500" />,
      });
      // Refresh UI elements
      fetchSuites();
      fetchTestDirectoryStatus();

    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Clone Failed',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="git-url">Git Repository URL</Label>
        <div className="flex gap-2">
          <Input
            id="git-url"
            type="url"
            placeholder="https://github.com/user/repo.git"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={isLoading}
            onFocus={() => {
                setError(null);
                setSuccess(null);
            }}
          />
          <Button onClick={handleClone} disabled={isLoading || !repoUrl}>
            {isLoading ? <Loader2 className="animate-spin" /> : <GitBranch />}
            <span className="ml-2">Clone</span>
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 !text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
