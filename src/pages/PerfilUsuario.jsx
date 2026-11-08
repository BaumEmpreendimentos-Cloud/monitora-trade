import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert } from 'lucide-react';
import OperacoesCompartilhadas from '@/components/compartilhamento/OperacoesCompartilhadas';

export default function PerfilUsuario() {
  const { userId } = useParams();
  const [status, setStatus] = useState('ABERTA');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const res = await base44.functions.invoke('compartilharOperacoes', { action: 'operacoes', titularId: userId, status });
      setDados(res.data);
    } catch (e) {
      setDados(null);
      setErro(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, [userId, status]);

  useEffect(() => { load(); }, [load]);

  const nome = dados?.titular_nome || 'Perfil';
  const operacoes = dados?.operacoes || [];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">{nome}</h1>
          <p className="text-sm text-muted-foreground">Operações compartilhadas com você — somente leitura.</p>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="ABERTA">Posições abertas</TabsTrigger>
            <TabsTrigger value="FECHADA">Encerradas</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando operações...</p>
        ) : erro ? (
          <Card>
            <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" /> {erro}
            </CardContent>
          </Card>
        ) : operacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {status === 'ABERTA' ? 'Nenhuma operação aberta neste perfil.' : 'Nenhuma operação encerrada neste perfil.'}
          </p>
        ) : (
          <>
            <OperacoesCompartilhadas operacoes={operacoes} mostrarCusto={status === 'ABERTA'} />
            {dados?.has_more && (
              <p className="text-xs text-muted-foreground text-center">Mostrando as 500 operações mais recentes.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}