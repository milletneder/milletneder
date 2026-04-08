'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { CopyIcon, CheckIcon, EyeIcon, EyeOffIcon } from 'lucide-react';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/results',
    description: 'Aktif turun agirlikli sonuclari',
    params: 'round_id (opsiyonel)',
  },
  {
    method: 'GET',
    path: '/api/export/csv',
    description: 'CSV formatinda veri exportu',
    params: 'type: results | cities | demographics | districts',
  },
  {
    method: 'GET',
    path: '/api/researcher/cross-table',
    description: 'Capraz tablo verisi',
    params: 'rows: city | age | gender | education | income, cols: party',
  },
  {
    method: 'GET',
    path: '/api/researcher/archive',
    description: 'Gecmis tur arsivi',
    params: '-',
  },
  {
    method: 'GET',
    path: '/api/results/weighted',
    description: 'Agirlikli sonuclar (detayli)',
    params: 'scope, round_id',
  },
];

export default function ApiPage() {
  const { token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskedToken = token
    ? token.slice(0, 12) + '...' + token.slice(-8)
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          API Erisimi
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          JSON API ile anket verilerine programatik erisim.
        </p>
      </div>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kimlik Dogrulama</CardTitle>
          <CardDescription>
            Tum API isteklerinde Authorization header&apos;i ile JWT token gondermeniz gerekir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-500">JWT Token</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono break-all">
                {showToken ? token || 'Giris yapilmamis' : maskedToken || '***'}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="shrink-0"
              >
                {showToken ? (
                  <EyeOffIcon className="h-3.5 w-3.5" />
                ) : (
                  <EyeIcon className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!token}
                className="shrink-0"
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="mb-1 text-xs font-medium text-neutral-700">Header Formati</p>
            <code className="text-xs font-mono text-neutral-600">
              Authorization: Bearer {'<token>'}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoint Listesi</CardTitle>
          <CardDescription>
            Kullanilabilir API endpoint&apos;leri ve parametreleri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metod</TableHead>
                <TableHead>Yol</TableHead>
                <TableHead>Aciklama</TableHead>
                <TableHead>Parametreler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENDPOINTS.map((ep) => (
                <TableRow key={ep.path}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {ep.method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono">{ep.path}</code>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">
                    {ep.description}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {ep.params}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rate Limit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rate Limit</CardTitle>
          <CardDescription>
            API istekleriniz rate limit ile sinirlandirilmistir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Dakika Basi</p>
              <p className="text-lg font-bold text-neutral-900">60</p>
              <p className="text-xs text-neutral-400">istek/dakika</p>
            </div>
            <div className="rounded-md border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Gunluk</p>
              <p className="text-lg font-bold text-neutral-900">10.000</p>
              <p className="text-xs text-neutral-400">istek/gun</p>
            </div>
            <div className="rounded-md border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Aylik</p>
              <p className="text-lg font-bold text-neutral-900">100.000</p>
              <p className="text-xs text-neutral-400">istek/ay</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kod Ornekleri</CardTitle>
          <CardDescription>
            API&apos;ye erisim icin ornek kodlar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* cURL */}
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-700">cURL</p>
            <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs font-mono leading-relaxed">
{`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  https://milletneder.com/api/v1/results`}
            </pre>
          </div>

          {/* JavaScript */}
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-700">JavaScript (fetch)</p>
            <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs font-mono leading-relaxed">
{`const response = await fetch(
  "https://milletneder.com/api/v1/results",
  {
    headers: {
      Authorization: "Bearer YOUR_TOKEN",
    },
  }
);
const data = await response.json();
console.log(data);`}
            </pre>
          </div>

          {/* Python */}
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-700">Python (requests)</p>
            <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs font-mono leading-relaxed">
{`import requests

response = requests.get(
    "https://milletneder.com/api/v1/results",
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)
data = response.json()
print(data)`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
