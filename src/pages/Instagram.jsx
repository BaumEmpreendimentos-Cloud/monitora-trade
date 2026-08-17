import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Instagram, MessageCircle, Heart, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function InstagramPage() {
  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('instagramComments', {});
      setProfile(res.data?.profile || null);
      setMedia(res.data?.media || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erro ao carregar dados do Instagram.');
      setProfile(null);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalComments = media.reduce((sum, m) => sum + (m.comments?.length || 0), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold">Instagram</h1>
              <p className="text-sm text-muted-foreground">
                {profile ? `@${profile.username}` : 'Comentários das suas publicações'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>

        {!loading && !error && profile && media.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{media.length}</div>
                <div className="text-xs text-muted-foreground uppercase">Publicações</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{totalComments}</div>
                <div className="text-xs text-muted-foreground uppercase">Comentários</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">@{profile.username}</div>
                <div className="text-xs text-muted-foreground uppercase">Conta</div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando publicações...</p>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">Tentar novamente</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && media.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Instagram className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma publicação encontrada.</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && media.length > 0 && (
          <div className="space-y-4">
            {media.map((post) => {
              const isOpen = expandedId === post.id;
              const previewComments = post.comments?.slice(0, 3) || [];
              const hiddenComments = (post.comments?.length || 0) - previewComments.length;

              return (
                <Card key={post.id}>
                  <CardContent className="p-0">
                    {/* Media header */}
                    <div className="flex items-center gap-3 p-3 border-b">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                        <Instagram className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">@{profile?.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {post.timestamp ? new Date(post.timestamp).toLocaleString('pt-BR') : ''}
                        </div>
                      </div>
                      <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Media preview */}
                    {post.media_url && (
                      <div className="w-full aspect-square max-h-[400px] overflow-hidden bg-muted">
                        <Image src={post.media_url} fittingType="fill" className="w-full h-full" alt={post.caption?.slice(0, 50) || 'Instagram post'} />
                      </div>
                    )}

                    {/* Caption */}
                    {post.caption && (
                      <div className="p-3 text-sm">
                        <span className="font-medium">@{profile?.username}</span>{' '}
                        <span className="whitespace-pre-wrap break-words">{post.caption}</span>
                      </div>
                    )}

                    {/* Comments */}
                    <div className="border-t">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : post.id)}
                        className="w-full flex items-center gap-2 p-3 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {post.comments?.length || 0} comentário{(post.comments?.length || 0) !== 1 ? 's' : ''}
                        <span className="ml-auto text-xs">{isOpen ? 'Ocultar' : 'Ver'}</span>
                      </button>

                      {isOpen && post.comments?.length > 0 && (
                        <div className="px-3 pb-3 space-y-3">
                          {post.comments.map((c) => (
                            <div key={c.id} className="flex gap-2 text-sm">
                              <div className="flex-1">
                                <span className="font-medium">{c.username}</span>{' '}
                                <span className="break-words">{c.text}</span>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                  <span>{c.timestamp ? new Date(c.timestamp).toLocaleString('pt-BR') : ''}</span>
                                  {c.like_count > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Heart className="w-3 h-3" /> {c.like_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isOpen && previewComments.length > 0 && (
                        <div className="px-3 pb-3 space-y-2">
                          {previewComments.map((c) => (
                            <div key={c.id} className="text-sm">
                              <span className="font-medium">{c.username}</span>{' '}
                              <span className="break-words">{c.text}</span>
                            </div>
                          ))}
                          {hiddenComments > 0 && (
                            <button onClick={() => setExpandedId(post.id)} className="text-xs text-muted-foreground hover:text-foreground">
                              Ver mais {hiddenComments} comentário{hiddenComments !== 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}