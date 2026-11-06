import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import EditarHistoricoDialog from '@/components/operacoes/EditarHistoricoDialog';
import HistoricoGrupoCard from '@/components/operacoes/HistoricoGrupoCard';

export default function Historico() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending: loading, error: loadError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['historico', 'grupos'],
    queryFn: async ({ pageParam }) => (await base44.functions.invoke('historicoOperacoes', { action: 'grupos', page: pageParam })).data,
    initialPageParam: 0,
    getNextPageParam: (last) => last.next_page ?? undefined,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const grupos = data?.pages.flatMap((page) => page.items) ?? [];
  const [error, setError] = useState('');
  const [editarOp, setEditarOp] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);


  const handleEditar = async (id, dados) => {
    setSaving(true); setError('');
    try {
      await base44.entities.Operacao.update(id, dados);
      await queryClient.invalidateQueries({ queryKey: ['historico'] });
      setEditarOp(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const o = toDelete;
    if (!o) return;
    setSaving(true); setError('');
    try {
      await base44.entities.Operacao.delete(o.id);
      await queryClient.invalidateQueries({ queryKey: ['historico'] });
      setToDelete(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };


  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Histórico de Operações</h1>
          <Button size="sm" onClick={() => navigate('/importar-historico')}><Upload className="w-4 h-4 mr-1" /> Importar Histórico</Button>
        </div>
        {(error || loadError) && <p className="text-sm text-destructive">{error || loadError?.response?.data?.error || loadError?.message}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma operação encerrada.</p>
        ) : (
          grupos.map((grupo) => <HistoricoGrupoCard key={grupo.id} grupo={grupo} onEdit={setEditarOp} onDelete={setToDelete} />)
        )}
        {hasNextPage && <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Carregando...' : 'Carregar mais identificadores'}</Button>}
        <EditarHistoricoDialog operacao={editarOp} onClose={() => setEditarOp(null)} onSubmit={handleEditar} />
        <ResponsiveDialog
          open={!!toDelete}
          onOpenChange={(v) => !v && setToDelete(null)}
          title="Excluir operação"
          className="max-w-sm"
          footer={<><Button variant="outline" onClick={() => setToDelete(null)} disabled={saving}>Cancelar</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? 'Excluindo...' : 'Excluir'}</Button></>}
        >
          <p className="text-sm text-muted-foreground">Deseja realmente excluir a operação <b>{toDelete?.ativo}</b>? Essa ação não pode ser desfeita.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </ResponsiveDialog>
      </div>
    </div>
  );
}