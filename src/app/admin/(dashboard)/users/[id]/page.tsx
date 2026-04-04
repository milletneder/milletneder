'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { badge, btn, table } from '@/lib/ui';

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
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Admin-Token'] = token;
  return headers;
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
    const messages: Record<string, string> = {
      flag: 'Bu kullanıcıyı şüpheli olarak işaretlemek istediğinize emin misiniz?',
      unflag: 'Şüpheli işaretini kaldırmak istediğinize emin misiniz?',
      deactivate: 'Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz? Giriş yapamayacak.',
      activate: 'Bu kullanıcıyı etkinleştirmek istediğinize emin misiniz?',
    };

    if (!window.confirm(messages[action] || 'Emin misiniz?')) return;

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
      alert('Bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz! Tüm oyları, cihaz kayıtları ve profil bilgileri silinecektir.')) return;
    if (!window.confirm('Son kez onaylayın: Kullanıcı #' + id + ' kalıcı olarak silinecek.')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        alert('Kullanıcı başarıyla silindi.');
        router.push('/admin/users');
      } else {
        const data = await res.json();
        alert(data.error || 'Silme işlemi başarısız');
      }
    } catch {
      alert('Bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-neutral-500 text-sm py-10 text-center">Kullanıcı bulunamadı.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/users')}
          className="text-sm text-neutral-400 hover:text-black transition-colors"
        >
          ← Kullanıcılar
        </button>
        <h1 className="text-lg font-bold text-black font-mono">
          {user.identity_hash ? user.identity_hash.substring(0, 16) + '...' : `#${user.id}`}
        </h1>
      </div>

      {/* Kullanıcı Bilgileri */}
      <div className="border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-black mb-4">Kullanıcı Bilgileri</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Kimlik Hash</div>
            <div className="text-black font-mono text-xs break-all">{user.identity_hash || '—'}</div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Giriş Yöntemi</div>
            <div className="text-black">{user.auth_provider === 'phone' ? 'SMS' : 'E-posta'}</div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">İl</div>
            <div className="text-black">{user.city}</div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">İlçe</div>
            <div className="text-black">{user.district || '-'}</div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Kayıt tarihi</div>
            <div className="text-black">
              {new Date(user.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Europe/Istanbul',
              })}
            </div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Son giriş</div>
            <div className="text-black">
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
            <div className="text-neutral-400 text-xs mb-0.5">Şüpheli</div>
            <div>
              {user.is_flagged ? (
                <span className={badge.negative}>
                  Evet
                </span>
              ) : (
                <span className="text-neutral-300 text-xs">—</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Hesap durumu</div>
            <div>
              {user.is_active ? (
                <span className={badge.positive}>
                  Etkin
                </span>
              ) : (
                <span className={badge.negative}>
                  Devre dışı
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Referans kodu</div>
            <div className="text-black font-mono text-xs">{user.referral_code}</div>
          </div>
          <div>
            <div className="text-neutral-400 text-xs mb-0.5">Referans sayısı</div>
            <div className="text-black font-medium">{referralCount}</div>
          </div>
        </div>
      </div>

      {/* İşlem Butonları */}
      <div className="flex gap-3">
        {user.is_flagged ? (
          <button
            onClick={() => handleAction('unflag')}
            disabled={actionLoading}
            className={btn.secondary}
          >
            Şüpheli işaretini kaldır
          </button>
        ) : (
          <button
            onClick={() => handleAction('flag')}
            disabled={actionLoading}
            className={btn.primary}
          >
            Şüpheli işaretle
          </button>
        )}
        {user.is_active ? (
          <button
            onClick={() => handleAction('deactivate')}
            disabled={actionLoading}
            className={btn.secondary}
          >
            Devre dışı bırak
          </button>
        ) : (
          <button
            onClick={() => handleAction('activate')}
            disabled={actionLoading}
            className={btn.primary}
          >
            Etkinleştir
          </button>
        )}
      </div>

      {/* Oy Geçmişi */}
      <div className={table.container}>
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-black">Oy geçmişi</h2>
          <span className="text-xs text-neutral-400">{votes.length} kayıt</span>
        </div>
        <table className="w-full text-sm">
          <thead className={`border-b border-neutral-200 bg-neutral-50`}>
            <tr>
              <th className={table.th}>Parti</th>
              <th className={table.th}>Tur</th>
              <th className={table.th}>Durum</th>
              <th className={table.th}>Değişiklik</th>
              <th className={table.th}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {votes.length > 0 ? (
              votes.map((vote) => (
                <tr key={vote.id} className="border-b border-neutral-100">
                  <td className="px-4 py-2.5 text-black font-medium">{vote.party}</td>
                  <td className="px-4 py-2.5 text-black">Tur #{vote.round_id}</td>
                  <td className="px-4 py-2.5">
                    <span className={vote.is_valid ? badge.positive : badge.negative}>
                      {vote.is_valid ? 'Geçerli' : 'Geçersiz'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-black">{vote.change_count}x</td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {new Date(vote.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={table.empty}>
                  Oy kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hesap Sil */}
      <div className="border border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-medium text-red-800 mb-2">Tehlikeli Bölge</h2>
        <p className="text-xs text-red-600 mb-3">
          Bu kullanıcıyı silmek geri alınamaz. Tüm oyları, cihaz kayıtları ve profil bilgileri kalıcı olarak silinecektir.
        </p>
        <button
          onClick={handleDelete}
          disabled={actionLoading}
          className="bg-red-600 text-white px-4 py-2 text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          Kullanıcıyı Sil
        </button>
      </div>

      {/* Cihaz Kayıtları */}
      <div className={table.container}>
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-black">Cihaz kayıtları</h2>
          <span className="text-xs text-neutral-400">{deviceLogs.length} kayıt</span>
        </div>
        <table className="w-full text-sm">
          <thead className={`border-b border-neutral-200 bg-neutral-50`}>
            <tr>
              <th className={table.th}>Fingerprint</th>
              <th className={table.th}>IP</th>
              <th className={table.th}>User Agent</th>
              <th className={table.th}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {deviceLogs.length > 0 ? (
              deviceLogs.map((log) => (
                <tr key={log.id} className="border-b border-neutral-100">
                  <td className="px-4 py-2.5 text-black font-mono text-xs">
                    {log.fingerprint ? log.fingerprint.substring(0, 16) + '...' : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-black font-mono text-xs">{log.ip_address || '-'}</td>
                  <td className="px-4 py-2.5 text-neutral-500 text-xs max-w-xs truncate">
                    {log.user_agent || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {new Date(log.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Istanbul',
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className={table.empty}>
                  Cihaz kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
