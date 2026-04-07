'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ArrowLeft, MessageSquare, ThumbsUp, ThumbsDown, Loader2, Plus } from 'lucide-react';

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
  user_vote: 'up' | 'down' | null;
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

  const handleVote = async (id: number, is_upvote: boolean) => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`/api/features/${id}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ is_upvote }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const oldVote = item.user_vote;
            const newVote = data.user_vote as 'up' | 'down' | null;
            let diff = 0;
            if (oldVote === null && newVote === 'up') diff = 1;
            else if (oldVote === null && newVote === 'down') diff = -1;
            else if (oldVote === 'up' && newVote === null) diff = -1;
            else if (oldVote === 'down' && newVote === null) diff = 1;
            else if (oldVote === 'up' && newVote === 'down') diff = -2;
            else if (oldVote === 'down' && newVote === 'up') diff = 2;
            return { ...item, user_vote: newVote, vote_count: item.vote_count + diff };
          })
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
        const res2 = await fetch(`/api/features/${selectedId}/comments`, { headers });
        if (res2.ok) {
          const data = await res2.json();
          setComments(data.comments);
        }
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
            <h1 className="text-xl font-bold">Özellik Önerileri</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Platformu birlikte geliştirelim. Öneri yap, oyla, tartış.
            </p>
          </div>
          {isLoggedIn && !selectedId && (
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'İptal' : (
                <>
                  <Plus className="size-4 mr-1.5" />
                  Yeni Öneri
                </>
              )}
            </Button>
          )}
        </div>

        {/* Yeni Oneri Formu */}
        {showForm && (
          <Card className="mb-6">
            <CardContent className="pt-5 space-y-4">
              <h2 className="text-sm font-bold">Yeni Öneri</h2>
              {formError && (
                <p className="text-sm bg-muted border border-border rounded-lg p-2">{formError}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Kısa ve net bir başlık"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Açıklama</Label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Önerinizi detaylı açıklayın..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : 'Gönder'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Detay Gorunumu */}
        {selectedId && selectedItem && (
          <div className="mb-6">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Tüm öneriler
            </button>

            <Card>
              <CardContent className="pt-5">
                <h2 className="text-lg font-bold">{selectedItem.title}</h2>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{selectedItem.description}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {selectedItem.author_city} · {timeAgo(selectedItem.created_at)}
                </p>

                {/* Evet / Hayir oy butonlari */}
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Bu öneriyi destekliyor musun?</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={selectedItem.user_vote === 'up' ? 'default' : 'outline'}
                      onClick={() => handleVote(selectedItem.id, true)}
                      disabled={!isLoggedIn}
                    >
                      <ThumbsUp className="size-3.5 mr-1" />
                      Evet
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedItem.user_vote === 'down' ? 'default' : 'outline'}
                      onClick={() => handleVote(selectedItem.id, false)}
                      disabled={!isLoggedIn}
                    >
                      <ThumbsDown className="size-3.5 mr-1" />
                      Hayır
                    </Button>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{selectedItem.vote_count}</span>
                  <span className="text-xs text-muted-foreground">puan</span>
                </div>
              </CardContent>
            </Card>

            {/* Yorumlar */}
            <div className="mt-4">
              <h3 className="text-sm font-bold mb-3">
                Yorumlar ({selectedItem.comment_count})
              </h3>

              {commentsLoading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz yorum yok.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="border border-border rounded-lg p-3">
                      <p className="text-sm">{c.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.author_city} · {timeAgo(c.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Yorum yaz */}
              {isLoggedIn && (
                <div className="mt-4 flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    maxLength={1000}
                    onKeyDown={(e) => e.key === 'Enter' && !commentSubmitting && handleComment()}
                  />
                  <Button
                    onClick={handleComment}
                    disabled={commentSubmitting || !commentText.trim()}
                  >
                    {commentSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : 'Gönder'}
                  </Button>
                </div>
              )}
              {!isLoggedIn && (
                <p className="text-xs text-muted-foreground mt-3">Yorum yapmak için giriş yapın.</p>
              )}
            </div>
          </div>
        )}

        {/* Liste */}
        {!selectedId && (
          <>
            {/* Siralama */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={sort === 'votes' ? 'default' : 'outline'}
                onClick={() => setSort('votes')}
              >
                En Çok Oylanan
              </Button>
              <Button
                size="sm"
                variant={sort === 'new' ? 'default' : 'outline'}
                onClick={() => setSort('new')}
              >
                En Yeni
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Henüz öneri yok.</p>
                  {isLoggedIn && (
                    <Button className="mt-3" onClick={() => setShowForm(true)}>
                      İlk öneriyi sen yap
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id} className="hover:border-foreground/20 transition-colors">
                    <CardContent className="pt-4 pb-3">
                      {/* Icerik */}
                      <div className="cursor-pointer" onClick={() => openDetail(item.id)}>
                        <h3 className="text-sm font-bold truncate">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{item.author_city}</span>
                          <span>{timeAgo(item.created_at)}</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {item.comment_count}
                          </span>
                        </div>
                      </div>

                      {/* Evet / Hayir oy butonlari */}
                      <Separator className="my-3" />
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant={item.user_vote === 'up' ? 'default' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); handleVote(item.id, true); }}
                          disabled={!isLoggedIn}
                        >
                          <ThumbsUp className="size-3 mr-1" />
                          Evet
                        </Button>
                        <Button
                          size="xs"
                          variant={item.user_vote === 'down' ? 'default' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); handleVote(item.id, false); }}
                          disabled={!isLoggedIn}
                        >
                          <ThumbsDown className="size-3 mr-1" />
                          Hayır
                        </Button>
                        <span className="text-sm font-bold tabular-nums ml-1">{item.vote_count}</span>
                        <span className="text-xs text-muted-foreground">puan</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoggedIn && items.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Öneri yapmak ve oy vermek için giriş yapın.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
