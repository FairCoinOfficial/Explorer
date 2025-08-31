"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="mono whitespace-pre-wrap break-all mt-2">{error.message}</pre>
        </CardContent>
      </Card>
    </main>
  );
}
