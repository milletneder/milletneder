'use client';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditEntry {
  id: number;
  admin_id: number;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            <div className="flex gap-4 p-3 border-b">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-3 border-b last:border-0">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchLog() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (adminFilter) params.set('adminId', adminFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (targetTypeFilter) params.set('targetType', targetTypeFilter);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const res = await fetch(`/api/admin/audit-log?${params.toString()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setEntries(data.logs || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchLog();
  }, [page, adminFilter, actionFilter, targetTypeFilter]);

  if (loading && entries.length === 0) {
    return <AuditLogSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder="Admin ID..."
          value={adminFilter}
          onChange={(e) => {
            setAdminFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <Input
          type="text"
          placeholder="Islem tipi..."
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <Input
          type="text"
          placeholder="Hedef tipi..."
          value={targetTypeFilter}
          onChange={(e) => {
            setTargetTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Islem</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {entry.created_at ? (
                      <>
                        {new Date(entry.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}{' '}
                        {new Date(entry.created_at).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Istanbul',
                        })}
                      </>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{entry.admin_name || '-'}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>
                    {entry.target_type || ''} {entry.target_id ? `#${entry.target_id}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {entry.details ? JSON.stringify(entry.details) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Denetim kaydi bulunamadi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Sayfa {page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Onceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
