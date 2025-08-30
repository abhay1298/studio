
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Play, Terminal } from 'lucide-react';
import Link from 'next/link';

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
            Local Setup Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to connect Robot Maestro to your local Robot Framework projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h2 className="font-headline text-xl font-semibold mb-2">How It Works</h2>
            <p className="text-muted-foreground">
              Robot Maestro consists of two parts: a user interface (the **frontend**) that you interact with in your browser, and a local server (the **backend**) that is responsible for actually running your Robot Framework tests. You need to have both running at the same time.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold border-b pb-2 mb-4">Part 1: Running the Frontend (This App)</h3>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
              <div>
                <h4 className="font-semibold">Open a Terminal</h4>
                <p className="text-muted-foreground">
                  Navigate your terminal to the root directory of this project folder.
                </p>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
              <div>
                <h4 className="font-semibold">Install Dependencies</h4>
                <p className="text-muted-foreground mb-2">
                  Run the following command to install all the necessary Node.js packages:
                </p>
                <pre className="bg-muted p-2 rounded-md font-mono text-sm">npm install</pre>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
              <div>
                <h4 className="font-semibold">Run the Development Server</h4>
                <p className="text-muted-foreground mb-2">
                  Once installation is complete, run this command:
                </p>
                <pre className="bg-muted p-2 rounded-md font-mono text-sm">npm run dev</pre>
                 <p className="text-muted-foreground mt-2">
                  The Robot Maestro UI will now be available at <a href="http://localhost:9002" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">http://localhost:9002</a>. Keep this terminal window open.
                </p>
              </div>
            </div>
          </div>
          
           <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold border-b pb-2 mb-4">Part 2: Running the Python Backend</h3>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
              <div>
                <h4 className="font-semibold">Open a New Terminal</h4>
                <p className="text-muted-foreground">
                  It's important to use a **new, separate terminal** for this step. Navigate into the <code className="font-mono bg-muted p-1 rounded">python_backend_example</code> directory.
                </p>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
              <div>
                <h4 className="font-semibold">Install Dependencies</h4>
                <p className="text-muted-foreground mb-2">
                  In your new terminal, install the required Python libraries using the provided requirements file:
                </p>
                <pre className="bg-muted p-2 rounded-md font-mono text-sm">pip install -r requirements.txt</pre>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
              <div>
                <h4 className="font-semibold text-destructive">Crucial: Configure Your Test Path</h4>
                 <p className="text-muted-foreground mb-2">
                  Open the file <code className="font-mono bg-muted p-1 rounded">python_backend_example/server.py</code> and locate the `tests_directory` variable. **You must change this path** to point to the absolute path of the folder containing your Robot Framework test files.
                </p>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">4</div>
              <div>
                <h4 className="font-semibold">Run the Backend Server</h4>
                <p className="text-muted-foreground mb-2">
                  From the `python_backend_example` directory, run this command:
                </p>
                <pre className="bg-muted p-2 rounded-md font-mono text-sm">flask --app server run --port=5001</pre>
                 <p className="text-muted-foreground mt-2">
                  This server will now listen for jobs from the UI. Keep this second terminal window open.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold border-b pb-2 mb-4">Part 3: Execute Your Tests</h3>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Play className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">You're Ready to Go!</h4>
                <p className="text-muted-foreground">
                  With both servers running, you can now use the Robot Maestro UI. Navigate to the <Link href="/dashboard/execution" className="text-primary font-medium hover:underline">Execution</Link> page, enter your tags or suite names, and click run. The results you see will be from your actual Robot Framework project.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
