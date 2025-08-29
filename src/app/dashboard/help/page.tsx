import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, UploadCloud, Play, FileText } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Help & Documentation
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Bot className="text-primary" />
            How Robot Maestro Works
          </CardTitle>
          <CardDescription>
            Understanding the communication flow between this UI and your Robot Framework projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h2 className="font-headline text-xl font-semibold mb-4">The Big Picture</h2>
            <p className="text-muted-foreground">
              Robot Maestro acts as a central command center, or an <strong>orchestrator</strong>, for your Robot Framework projects. It provides a user-friendly interface to manage test assets, trigger executions, and visualize results. It does not run the Robot Framework code directly in your browser.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold">The Workflow</h3>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">1. Upload Your Project</h4>
                <p className="text-muted-foreground">
                  Using the "Project Management" card on the Dashboard, you upload your Robot Framework project as a single `.zip` file. You can also upload associated test data files (e.g., `.xlsx`, `.csv`) that your tests might need.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Play className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">2. Trigger an Execution</h4>
                <p className="text-muted-foreground">
                  Navigate to the "Execution" page. Here, you can specify which tests to run by providing tags, suite names, or individual test cases. When you click "Run", this application sends a command to a separate backend execution environment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>
              </div>
              <div>
                <h4 className="font-semibold">3. Backend Execution</h4>
                <p className="text-muted-foreground">
                  This is the part you would set up separately. The backend environment receives the command, unzips your project, and runs the standard Robot Framework command-line tool (`robot`) with the parameters you specified. It's responsible for the actual test execution.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">4. View Results</h4>
                <p className="text-muted-foreground">
                  As the tests run, the backend captures the live logs and streams them back to the "Execution Logs" panel. Once finished, the final reports (`log.html`, `report.html`, `output.xml`) are processed, and the results are displayed on the "Reports" and "Results" pages for analysis.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
