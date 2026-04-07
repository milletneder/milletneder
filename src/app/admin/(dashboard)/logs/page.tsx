'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthLogsPage from '../auth-logs/page';
import AuditLogPage from '../audit-log/page';

export default function LogsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Günlükler</h1>

      <Tabs defaultValue="auth">
        <TabsList>
          <TabsTrigger value="auth">Auth Günlükleri</TabsTrigger>
          <TabsTrigger value="audit">Denetim Kaydı</TabsTrigger>
        </TabsList>
        <TabsContent value="auth" className="mt-4">
          <AuthLogsPage />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
