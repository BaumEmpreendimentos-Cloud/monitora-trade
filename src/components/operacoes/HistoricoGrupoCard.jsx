import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import HistoricoGrupoDesktop from '@/components/operacoes/HistoricoGrupoDesktop';
import HistoricoGrupoMobile from '@/components/operacoes/HistoricoGrupoMobile';

export default function HistoricoGrupoCard({ grupo, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['historico', 'detalhes', grupo.id],
    queryFn: async ({ pageParam }) => (await base44.functions.invoke('historicoOperacoes', { action: 'detalhes', grupoId: grupo.id, ...pageParam })).data,
    initialPageParam: {},
    getNextPageParam: (last) => last.operacoes.has_more || last.dividendos.has_more ? {
      opsCursor: last.operacoes.has_more ? last.operacoes.next_cursor : false,
      divCursor: last.dividendos.has_more ? last.dividendos.next_cursor : false,
    } : undefined,
    enabled: expanded,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const lista = data?.pages.flatMap((page) => page.operacoes.items) ?? [];
  const divs = data?.pages.flatMap((page) => page.dividendos.items) ?? [];
  const onToggle = () => setExpanded((value) => !value);
  return (
    <Card><CardContent className="p-0">
      <HistoricoGrupoDesktop grupo={grupo} lista={lista} divs={divs} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      <HistoricoGrupoMobile nome={grupo.nome} lista={lista} divs={divs} total={grupo.total} onEdit={onEdit} onDelete={onDelete} collapsed={!expanded} onToggle={onToggle} />
      {expanded && isPending && <p className="p-3 text-sm text-muted-foreground">Carregando operações e dividendos...</p>}
      {expanded && isError && <p className="p-3 text-sm text-destructive">{error.response?.data?.error || error.message}</p>}
      {expanded && hasNextPage && <div className="p-3"><Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Carregando...' : 'Carregar mais lançamentos'}</Button></div>}
    </CardContent></Card>
  );
}