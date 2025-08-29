
import { DataFileEditor } from '@/components/dashboard/data-file-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataEditorPage() {
  return (
    <div className="space-y-6">
       <h1 className="font-headline text-3xl font-bold tracking-tight">
        Data File Editor
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Edit your Test Data</CardTitle>
          <CardDescription>
            Modify the values in your uploaded CSV or Excel file. Changes can be saved and downloaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <DataFileEditor />
        </CardContent>
      </Card>
    </div>
  );
}
