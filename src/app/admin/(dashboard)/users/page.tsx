'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';

interface User {
  id: number;
  identity_hash: string | null;
  city: string;
  district: string;
  is_flagged: boolean;
  is_dummy: boolean;
  auth_provider: string;
  referral_code: string | null;
  created_at: string;
  last_login_at: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [flagFilter, setFlagFilter] = useState('all');
  const [dummyFilter, setDummyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (flagFilter !== 'all') params.set('flagged', flagFilter);
      if (dummyFilter !== 'all') params.set('dummy', dummyFilter);

      try {
        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [page, search, city, flagFilter, dummyFilter]);

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Kullanıcılar</h1>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <InputGroup className="w-64">
          <InputGroupAddon align="inline-start">
            <InputGroupText>
              <Search className="size-4" />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            placeholder="İl veya referans kodu ara..."
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </InputGroup>

        <Input
          placeholder="İl filtrele..."
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1); }}
          className="w-40"
        />

        <Select value={dummyFilter} onValueChange={(v) => { setDummyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Tür" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="false">Gerçek</SelectItem>
            <SelectItem value="true">Sentetik</SelectItem>
          </SelectContent>
        </Select>

        <Select value={flagFilter} onValueChange={(v) => { setFlagFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="true">Şüpheli</SelectItem>
            <SelectItem value="false">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kimlik Hash</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>İl</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {user.identity_hash ? user.identity_hash.substring(0, 12) + '...' : '—'}
                    </TableCell>
                    <TableCell>
                      {user.is_dummy ? (
                        <Badge variant="secondary">Sentetik</Badge>
                      ) : (
                        <Badge variant="outline">{user.auth_provider === 'phone' ? 'SMS' : 'E-posta'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.city}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
                    </TableCell>
                    <TableCell>
                      {user.is_flagged ? (
                        <Badge variant="destructive">Şüpheli</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Kullanıcı bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
