import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import CardAutorizacoes from '@/components/compartilhamento/CardAutorizacoes';
import CardPerfis from '@/components/compartilhamento/CardPerfis';

export default function Compartilhados() {
  const { user } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const res = await base44.entities.CompartilhamentoOperacoes.list('-created_date', 200);
      setRegistros(Array.isArray(res) ? res : res?.items || []);
    } catch (e) { setErro(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const autorizar = async (email) => {
    const res = await base44.functions.invoke('compartilharOperacoes', { action: 'autorizar', email });
    await load();
    return res.data?.mensagem || 'Acesso autorizado.';
  };

  const revogar = async (id) => {
    if (!confirm('Revogar o acesso deste usuário às suas operações?')) return;
    try {
      await base44.functions.invoke('compartilharOperacoes', { action: 'revogar', id });
      await load();
    } catch (e) { setErro(e.response?.data?.error || e.message); }
  };

  const meus = registros.filter((r) => r.titular_id === user?.id);
  const recebidos = registros.filter((r) => r.visualizador_id === user?.id);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Perfis</h1>
          <p className="text-sm text-muted-foreground">Compartilhe suas operações com autorização e acompanhe os perfis que liberaram acesso para você.</p>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <CardAutorizacoes autorizacoes={meus} onAutorizar={autorizar} onRevogar={revogar} />
            <CardPerfis perfis={recebidos} />
          </>
        )}
      </div>
    </div>
  );
}