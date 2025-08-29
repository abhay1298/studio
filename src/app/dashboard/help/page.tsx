
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Terminal, Play, Settings, UploadCloud } from 'lucide-react';
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
            Quick Start Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to connect Robot Maestro to your local Robot Framework projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h2 className="font-headline text-xl font-semibold mb-2">The Big Picture</h2>
            <p className="text-muted-foreground">
              Robot Maestro is a user interface (the **frontend**) that acts as a command center for your Robot Framework projects. It does not run tests by itself. Instead, it sends commands to a separate **backend** server that you run locally. This backend is responsible for the actual test execution.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold border-b pb-2 mb-4">Part 1: Running the Frontend (This App)</h3>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
              <div>
                <h4 className="font-semibold">Download and Unzip</h4>
                <p className="text-muted-foreground">
                  Use the "Download code" button in the Studio UI to get a `.zip` file of this project and extract it on your machine.
                </p>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
              <div>
                <h4 className="font-semibold">Install Dependencies</h4>
                <p className="text-muted-foreground mb-2">
                  Open a terminal, navigate into the project folder, and run:
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
                  The Robot Maestro UI will now be available at <a href="http://localhost:9002" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">http://localhost:9002</a>.
                </p>
              </div>
            </div>
          </div>
          
           <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold border-b pb-2 mb-4">Part 2: Running the Python Backend</h3>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
              <div>
                <h4 className="font-semibold">Find the Backend Code</h4>
                <p className="text-muted-foreground">
                  This project already includes an example backend server in the <code className="font-mono bg-muted p-1 rounded">python_backend_example</code> directory.
                </p>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
              <div>
                <h4 className="font-semibold">Install Dependencies</h4>
                <p className="text-muted-foreground mb-2">
                  In a **new terminal**, navigate to the `python_backend_example` directory and install its requirement (Flask):
                </p>
                <pre className="bg-muted p-2 rounded-md font-mono text-sm">pip install Flask</pre>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 text-lg items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
              <div>
                <h4 className="font-semibold">Run the Backend Server</h4>
                <p className="text-muted-foreground mb-2">
                  From the `python_backend_example` directory, run this command:
                </p>
                <pre className="bg-muted p-2 rounded-md font-mono text-sm">flask --app server run --port=5001</pre>
                 <p className="text-muted-foreground mt-2">
                  This server will now be listening for jobs from Robot Maestro.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-headline text-lg font-semibold border-b pb-2 mb-4">Part 3: Making it Real</h3>
             <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">Customize the Python Backend</h4>
                <p className="text-muted-foreground">
                  The provided <code className="font-mono bg-muted p-1 rounded">server.py</code> only *simulates* a test run. To execute your actual tests, you need to modify it.
                </p>
                <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
                    <li>Open `python_backend_example/server.py`.</li>
                    <li>Find the `run_robot_tests` function.</li>
                    <li>Replace the simulation logic with a call to Python's `subprocess` module.</li>
                    <li>Construct the actual `robot` command (e.g., `robot -i smoke path/to/your/tests`).</li>
                    <li>Capture the real output and return it.</li>
                </ul>
                 <p className="mt-2 text-sm text-muted-foreground">
                    This step is crucial for connecting Robot Maestro to your specific Robot Framework projects.
                 </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
