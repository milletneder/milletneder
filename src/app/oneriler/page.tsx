'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Header from '@/components/layout/Header';

interface FeatureRequest {
  id: number;
  title: string;
  description: string;
  vote_count: number;
  comment_count: number;
  is_open: boolean;
  created_at: string;
  author_anon_uid: string;
  author_city: string;
  user_voted: boolean;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  author_anon_uid: string;
  author_city: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return `${Math.floor(days / 30)} ay önce`;
}

export default function OnerilerPage() {
  const { isLoggedIn, token } = useAuth();
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'votes' | 'new'>('votes');

  // Yeni oneri formu
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Detay / yorumlar
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/features?sort=${sort}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [sort, token]);

  const handleSubmit = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setShowForm(false);
        fetchItems();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Bir hata oluştu');
      }
    } catch {
      setFormError('Bağlantı hatası');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: number) => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`/api/features/${id}/vote`, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, user_voted: data.voted, vote_count: item.vote_count + (data.voted ? 1 : -1) }
              : item
          )
        );
      }
    } catch { /* ignore */ }
  };

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setCommentsLoading(true);
    setCommentText('');
    try {
      const res = await fetch(`/api/features/${id}/comments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch { /* ignore */ } finally {
      setCommentsLoading(false);
    }
  };

  const handleComment = async () => {
    if (!selectedId || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/features/${selectedId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        setCommentText('');
        // Yorumlari yeniden yukle
        const res2 = await fetch(`/api/features/${selectedId}/comments`, { headers });
        if (res2.ok) {
          const data = await res2.json();
          setComments(data.comments);
        }
        // Yorum sayisini guncelle
        setItems((prev) =>
          prev.map((item) =>
            item.id === selectedId ? { ...item, comment_count: item.comment_count + 1 } : item
          )
        );
      }
    } catch { /* ignore */ } finally {
      setCommentSubmitting(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-black">Özellik Önerileri</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Platformu birlikte geliştirelim. Öneri yap, oyla, tartış.
            </p>
          </div>
          {isLoggedIn && !selectedId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-neutral-800 transition-colors"
            >
              {showForm ? 'İptal' : 'Yeni Öneri'}
            </button>
          )}
        </div>

        {/* Yeni Oneri Formu */}
        {showForm && (
          <div className="border border-neutral-200 p-5 mb-6">
            <h2 className="text-sm font-bold text-black mb-3">Yeni Öneri</h2>
            {formError && (
              <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 p-2 mb-3">{formError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Başlık</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Kısa ve net bir başlık"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Açıklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Önerinizi detaylı açıklayın..."
                  className="w-full px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
                className="px-5 py-2 text-sm font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </div>
        )}

        {/* Detay Gorunumu */}
        {selectedId && selectedItem && (
          <div className="mb-6">
            <button
              onClick={() => setSelectedId(null)}
              className="text-sm text-neutral-500 hover:text-black mb-4 transition-colors"
            >
              ← Tüm öneriler
            </button>

            <div className="border border-neutral-200 p-5">
              <div className="flex gap-4">
                <button
                  onClick={() => handleVote(selectedItem.id)}
                  disabled={!isLoggedIn}
                  className={`flex flex-col items-center justify-center min-w-[48px] py-2 border transition-colors ${
                    selectedItem.user_voted
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-200 text-neutral-500 hover:border-black hover:text-black'
                  } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                  <span className="text-sm font-bold">{selectedItem.vote_count}</span>
                </button>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-black">{selectedItem.title}</h2>
                  <p className="text-sm text-neutral-600 mt-2 whitespace-pre-wrap">{selectedItem.description}</p>
                  <p className="text-xs text-neutral-400 mt-3">
                    {selectedItem.author_city} · {timeAgo(selectedItem.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Yorumlar */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-black mb-3">
                Yorumlar ({selectedItem.comment_count})
              </h3>

              {commentsLoading ? (
                <p className="text-sm text-neutral-400">Yükleniyor...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-neutral-400">Henüz yorum yok.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="border border-neutral-100 p-3">
                      <p className="text-sm text-black">{c.content}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {c.author_city} · {timeAgo(c.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Yorum yaz */}
              {isLoggedIn && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    maxLength={1000}
                    onKeyDown={(e) => e.key === 'Enter' && !commentSubmitting && handleComment()}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={handleComment}
                    disabled={commentSubmitting || !commentText.trim()}
                    className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {commentSubmitting ? '...' : 'Gönder'}
                  </button>
                </div>
              )}
              {!isLoggedIn && (
                <p className="text-xs text-neutral-400 mt-3">Yorum yapmak için giriş yapın.</p>
              )}
            </div>
          </div>
        )}

        {/* Liste */}
        {!selectedId && (
          <>
            {/* Siralama */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSort('votes')}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                  sort === 'votes' ? 'bg-black text-white border-black' : 'bg-white text-neutral-500 border-neutral-200 hover:border-black'
                }`}
              >
                En Çok Oylanan
              </button>
              <button
                onClick={() => setSort('new')}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                  sort === 'new' ? 'bg-black text-white border-black' : 'bg-white text-neutral-500 border-neutral-200 hover:border-black'
                }`}
              >
                En Yeni
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-neutral-400 py-8 text-center">Yükleniyor...</p>
            ) : items.length === 0 ? (
              <div className="text-center py-12 border border-neutral-200">
                <p className="text-sm text-neutral-500">Henüz öneri yok.</p>
                {isLoggedIn && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-3 px-4 py-2 text-sm font-medium bg-black text-white hover:bg-neutral-800 transition-colors"
                  >
                    İlk öneriyi sen yap
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 border border-neutral-200 p-4 hover:border-neutral-300 transition-colors">
                    {/* Oy butonu */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(item.id); }}
                      disabled={!isLoggedIn}
                      className={`flex flex-col items-center justify-center min-w-[44px] py-1.5 border transition-colors ${
                        item.user_voted
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-200 text-neutral-500 hover:border-black hover:text-black'
                      } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                      <span className="text-xs font-bold">{item.vote_count}</span>
                    </button>

                    {/* Icerik */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(item.id)}>
                      <h3 className="text-sm font-bold text-black truncate">{item.title}</h3>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                        <span>{item.author_city}</span>
                        <span>{timeAgo(item.created_at)}</span>
                        <span>{item.comment_count} yorum</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoggedIn && items.length > 0 && (
              <p className="text-xs text-neutral-400 text-center mt-4">
                Öneri yapmak ve oy vermek için giriş yapın.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
