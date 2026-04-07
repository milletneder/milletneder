'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface UserDetail {
  id: number;
  identity_hash: string | null;
  auth_provider: string;
  city: string;
  district: string;
  is_flagged: boolean;
  is_active: boolean;
  referral_code: string;
  last_login_at: string | null;
  created_at: string;
}

interface VoteRecord {
  id: number;
  party: string;
  round_id: number;
  is_valid: boolean;
  change_count: number;
  created_at: string;
}

interface DeviceLogRecord {
  id: number;
  fingerprint: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function getAdminHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  return headers;
}

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16 mb-1.5" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-36" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<DeviceLogRecord[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchUser() {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setVotes(data.votes || []);
        setDeviceLogs(data.deviceLogs || []);
        setReferralCount(data.referralCount ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAction(action: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchUser();
      } else {
        const data = await res.json();
        alert(data.error || 'İşlem başarısız');
      }
    } catch {
      alert('Bir hata olustu');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        alert('Kullanici basariyla silindi.');
        router.push('/admin/users');
      } else {
        const data = await res.json();
        alert(data.error || 'Silme islemi basarisiz');
      }
    } catch {
      alert('Bir hata olustu');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <UserDetailSkeleton />;
  }

  if (!user) {
    return <div className="text-muted-foreground text-sm py-10 text-center">Kullanici bulunamadi.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Baslik */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/users')}
        >
          &larr; Kullanicilar
        </Button>
        <h1 className="text-lg font-bold text-foreground font-mono">
          {user.identity_hash ? user.identity_hash.substring(0, 16) + '...' : `#${user.id}`}
        </h1>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Bilgiler</TabsTrigger>
          <TabsTrigger value="votes">Oylar ({votes.length})</TabsTrigger>
          <TabsTrigger value="devices">Cihazlar ({deviceLogs.length})</TabsTrigger>
        </TabsList>

        {/* Bilgiler Sekmesi */}
        <TabsContent value="info" className="space-y-6">
          {/* Kullanici Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Kullanici Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Kimlik Hash</div>
                  <div className="text-foreground font-mono text-xs break-all">{user.identity_hash || '\u2014'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Giriş Yöntemi</div>
                  <div className="text-foreground">{user.auth_provider === 'phone' ? 'SMS' : 'E-posta'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Il</div>
                  <div className="text-foreground">{user.city}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Ilce</div>
                  <div className="text-foreground">{user.district || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Kayıt tarihi</div>
                  <div className="text-foreground">
                    {new Date(user.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'Europe/Istanbul',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Son giris</div>
                  <div className="text-foreground">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Istanbul',
                        })
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Supheli</div>
                  <div>
                    {user.is_flagged ? (
                      <Badge variant="destructive">Evet</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">\u2014</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Hesap durumu</div>
                  <div>
                    {user.is_active ? (
                      <Badge variant="default">Etkin</Badge>
                    ) : (
                      <Badge variant="destructive">Devre disi</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Referans kodu</div>
                  <div className="text-foreground font-mono text-xs">{user.referral_code}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-0.5">Referans sayisi</div>
                  <div className="text-foreground font-medium">{referralCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* İşlem Butonları */}
          <div className="flex gap-3">
            {user.is_flagged ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={actionLoading}>
                    Supheli isaretini kaldir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Isareti Kaldir</AlertDialogTitle>
                    <AlertDialogDescription>
                      Supheli isaretini kaldirmak istediginize emin misiniz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgec</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('unflag')}>
                      Onayla
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={actionLoading}>
                    Supheli isaretle
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supheli Isaretle</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu kullaniciyi supheli olarak isaretlemek istediginize emin misiniz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgec</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('flag')}>
                      Onayla
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {user.is_active ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={actionLoading}>
                    Devre disi birak
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Devre Disi Birak</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu kullaniciyi devre disi birakmak istediginize emin misiniz? Giriş yapamayacak.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgec</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('deactivate')}>
                      Onayla
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={actionLoading}>
                    Etkinlestir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Etkinlestir</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu kullaniciyi etkinlestirmek istediginize emin misiniz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgec</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('activate')}>
                      Onayla
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Tehlikeli Bolge */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-sm text-destructive">Tehlikeli Bolge</CardTitle>
              <CardDescription className="text-destructive/80">
                Bu kullaniciyi silmek geri alinamaz. Tum oylari, cihaz kayitlari ve profil bilgileri kalici olarak silinecektir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={actionLoading}>
                    Kullaniciyi Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kullaniciyi Kalici Olarak Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu islem geri alinamaz! Kullanici #{id} ile ilgili tum oylar, cihaz kayitlari ve profil bilgileri kalici olarak silinecektir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgec</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDelete}>
                      Kalici Olarak Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oylar Sekmesi */}
        <TabsContent value="votes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Oy gecmisi</CardTitle>
              <span className="text-xs text-muted-foreground">{votes.length} kayit</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parti</TableHead>
                    <TableHead>Tur</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Degisiklik</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {votes.length > 0 ? (
                    votes.map((vote) => (
                      <TableRow key={vote.id}>
                        <TableCell className="font-medium">{vote.party}</TableCell>
                        <TableCell>Tur #{vote.round_id}</TableCell>
                        <TableCell>
                          <Badge variant={vote.is_valid ? 'default' : 'destructive'}>
                            {vote.is_valid ? 'Gecerli' : 'Gecersiz'}
                          </Badge>
                        </TableCell>
                        <TableCell>{vote.change_count}x</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(vote.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Oy kaydi bulunamadi.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cihazlar Sekmesi */}
        <TabsContent value="devices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Cihaz kayitlari</CardTitle>
              <span className="text-xs text-muted-foreground">{deviceLogs.length} kayit</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fingerprint</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceLogs.length > 0 ? (
                    deviceLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {log.fingerprint ? log.fingerprint.substring(0, 16) + '...' : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                          {log.user_agent || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Istanbul',
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Cihaz kaydi bulunamadi.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
