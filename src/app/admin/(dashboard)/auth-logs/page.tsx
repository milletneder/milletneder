'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuthLog {
  id: number;
  event_type: string;
  auth_method: string | null;
  identity_hint: string | null;
  user_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  error_code: string | null;
  error_message: string | null;
  details: string | null;
  created_at: string;
}

interface Summary {
  event_type: string;
  count: number;
}

const eventTypeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  login: { label: 'Giriş', variant: 'default' },
  login_fail: { label: 'Başarısız Giriş', variant: 'secondary' },
  register: { label: 'Kayıt', variant: 'default' },
  register_fail: { label: 'Başarısız Kayıt', variant: 'secondary' },
  register_incomplete: { label: 'Tamamlanmamış', variant: 'secondary' },
  register_blocked: { label: 'Engellendi', variant: 'secondary' },
  password_reset: { label: 'Şifre Sıfırlama', variant: 'outline' },
  password_change: { label: 'Şifre Değişikliği', variant: 'outline' },
  client_error: { label: 'Client Hata', variant: 'secondary' },
  otp_sent: { label: 'OTP Gönderim', variant: 'outline' },
  otp_verified: { label: 'OTP Doğrulama', variant: 'default' },
};

export default function AuthLogsPage() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filter) params.set('event_type', filter);
      const res = await fetch(`/api/admin/auth-logs?${params}`, {
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setSummary(data.summary);
      }
    } catch { /* */ }
    setLoading(false);
  }

  const eventInfo = (type: string) => eventTypeLabels[type] || { label: type, variant: 'outline' as const };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <span className="text-sm text-muted-foreground">{total.toLocaleString('tr-TR')} kayıt</span>
      </div>

      {/* Ozet kartlari */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {summary.map((s) => {
            const info = eventInfo(s.event_type);
            return (
              <Card
                key={s.event_type}
                className={`cursor-pointer transition-all ${
                  filter === s.event_type
                    ? 'ring-2 ring-primary'
                    : 'hover:ring-1 hover:ring-border'
                }`}
                onClick={() => { setFilter(filter === s.event_type ? '' : s.event_type); setPage(1); }}
              >
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-foreground">{s.count}</div>
                  <div className="text-[10px] text-muted-foreground">{info.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log tablosu */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tarih</TableHead>
                <TableHead className="text-xs">Olay</TableHead>
                <TableHead className="text-xs">Yöntem</TableHead>
                <TableHead className="text-xs">Sağlayıcı</TableHead>
                <TableHead className="text-xs">Kimlik</TableHead>
                <TableHead className="text-xs">User ID</TableHead>
                <TableHead className="text-xs">IP</TableHead>
                <TableHead className="text-xs">Hata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <span className="text-muted-foreground text-xs">Yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Log bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const info = eventInfo(log.event_type);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={info.variant} className="text-[10px]">
                          {info.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.auth_method || '-'}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {(() => {
                          try {
                            const d = log.details ? JSON.parse(log.details) : null;
                            return d?.sms_provider || '-';
                          } catch { return '-'; }
                        })()}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.identity_hint || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.user_id ?? '-'}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{log.ip_address || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {log.error_code ? (
                          <Badge variant="destructive" className="text-[10px]" title={log.error_message || ''}>
                            {log.error_code}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Önceki
          </Button>
          <span className="text-xs text-muted-foreground">
            Sayfa {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
