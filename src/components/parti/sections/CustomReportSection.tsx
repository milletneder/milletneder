'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileEdit, Loader2, Plus, Mail } from 'lucide-react';
import { useDashboard } from '../PartyDashboardProvider';

interface ReportRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  admin_notes: string | null;
  report_url: string | null;
  created_at: string;
}

interface ReportsResponse {
  requests: ReportRequest[];
  demoMode?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  in_progress: 'Hazirlaniyor',
  completed: 'Tamamlandi',
  rejected: 'Reddedildi',
};

export function CustomReportSection() {
  const { apiGet, apiPost, isReady, source } = useDashboard();
  const [requests, setRequests] = useState<ReportRequest[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const isDemo = source.kind === 'demo';

  const fetchRequests = useCallback(async () => {
    if (!isReady) return;
    try {
      const d = await apiGet<ReportsResponse>('/api/parti/custom-report');
      setRequests(d.requests || []);
      setDemoMode(!!d.demoMode);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isReady, apiGet]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (isDemo) {
      setFormError('Demo modunda rapor talebi olusturulamaz. Tam hesap icin iletisime gecin.');
      return;
    }

    if (!title.trim()) {
      setFormError('Baslik zorunludur');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/parti/custom-report', {
        title: title.trim(),
        description: description.trim(),
      });
      setTitle('');
      setDescription('');
      setShowForm(false);
      await fetchRequests();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Bir hata olustu');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ozel Rapor Talebi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ozel analiz veya rapor taleplerinizi buradan iletebilirsiniz.
          </p>
        </div>
        {!isDemo && (
          <Button
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            disabled={pendingCount >= 2}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Yeni Talep
          </Button>
        )}
      </div>

      {isDemo && (
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <Mail className="size-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Demo modunda ozel rapor talebi olusturulamaz.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Kurumsal hesap acmak icin{' '}
                <a
                  href="mailto:iletisim@milletneder.com"
                  className="underline hover:text-foreground"
                >
                  iletisim@milletneder.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isDemo && pendingCount >= 2 && (
        <p className="text-xs text-muted-foreground">
          En fazla 2 bekleyen talebiniz olabilir. Mevcut talepler tamamlandiktan sonra yeni
          talep olusturabilirsiniz.
        </p>
      )}

      {!isDemo && showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni Rapor Talebi</CardTitle>
            <CardDescription>Talep detaylarini belirtin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Baslik</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Orn: Istanbul ilce bazli detayli analiz"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Aciklama</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Raporda hangi verilerin, karsilastirmalarin veya analizlerin yer almasini istiyorsunuz?"
                  rows={4}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Gonder
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Iptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Talepleriniz</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <FileEdit className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {demoMode ? 'Demo modunda gecmis talep gosterilmez' : 'Henuz rapor talebiniz yok'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Baslik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Not</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {req.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[req.status] || req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {req.admin_notes || '-'}
                      {req.report_url && (
                        <a
                          href={req.report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 underline"
                        >
                          Raporu Goruntule
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
