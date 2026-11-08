import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import GrupoCompartilhado from '@/components/compartilhamento/GrupoCompartilhado';
import EncerrarDialog from '@/components/operacoes/EncerrarDialog';
import EditarOperacaoDialog from '@/components/operacoes/EditarOperacaoDialog';

const isOption = (c) => c === 'CALL' || c === 'PUT';

export default function PerfilUsuario() {
  const { userId } = useParams();
  const [status, setStatus] = useState('ABERTA');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [quotes, setQuotes] = useState({});
  const [prevQuotes, setPrevQuotes] = useState({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [encerrar, setEncerrar] = useState(null);
  const [editar, setEditar] = useState(null);
  const [erroAcao, setErroAcao] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setErro(''); }
    try {
      const res = await base44.functions.invoke('compartilharOperacoes', { action: 'operacoes', titularId: userId, status });
      setDados(res.data);
      setErro('');
    } catch (e) {
      if (!silent) {
        setDados(null);
        setErro(e.response?.data?.error || e.message);
      }
    } finally { if (!silent) setLoading(false); }
  }, [userId, status]);

  useEffect(() => { load(); }, [load]);

  const grupos = dados?.grupos || [];
  const abertas = grupos.flatMap((g) => g.ops).filter((o) => o.status === 'ABERTA');

  const fetchQuotes = useCallback(async () => {
    if (!abertas.length) { setQuotes({}); return; }
    const tickers = [...new Set([
      ...abertas.map((o) => o.ativo),
      ...abertas.filter((o) => isOption(o.categoria)).map((o) => o.ativo_base).filter(Boolean),
    ])];
    setLoadingQuotes(true);
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: tickers.join(',') });
      const map = {}; const prevMap = {};
      (res.data.quotes || []).forEach((q) => {
        const sym = q.symbol || q.ticker;
        map[sym] = q.close;
        let prev = q.close;
        if (q.variation != null && q.variation > -99.999) prev = q.close / (1 + q.variation / 100);
        else if (q.previous_close != null) prev = q.previous_close;
        prevMap[sym] = prev;
      });
      setQuotes(map); setPrevQuotes(prevMap);
    } catch (e) { /* cotação é complementar */ }
    finally { setLoadingQuotes(false); }
  }, [abertas.length, status]);

  useEffect(() => {
    if (status === 'ABERTA' && abertas.length) fetchQuotes();
    else setQuotes({});
  }, [status, abertas.length]);

  // Atualização automática das operações e cotações a cada 5 minutos
  useEffect(() => {
    const id = setInterval(() => {
      load(true);
      fetchQuotes();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load, fetchQuotes]);

  const handleEncerrar = async (preco, irrf) => {
    const o = encerrar;
    if (!o) return;
    setErroAcao('');
    try {
      await base44.functions.invoke('compartilharOperacoes', {
        action: 'encerrar', titularId: userId, operacaoId: o.id, precoFechamento: preco, irrf,
      });
      setEncerrar(null);
      await load();
    } catch (e) { setErroAcao(e.response?.data?.error || e.message); }
  };

  const handleEditar = async (form) => {
    const o = editar;
    if (!o) return;
    setErroAcao('');
    try {
      await base44.functions.invoke('compartilharOperacoes', {
        action: 'editar', titularId: userId, operacaoId: o.id, dados: form,
      });
      setEditar(null);
      await load();
    } catch (e) { setErroAcao(e.response?.data?.error || e.message); }
  };

  const nome = dados?.titular_nome || 'Perfil';

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">{nome}</h1>
            <p className="text-sm text-muted-foreground">Identificadores autorizados a você — os mesmos dados do titular, com edição e encerramento liberados.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loadingQuotes || status !== 'ABERTA' || !abertas.length}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingQuotes ? 'animate-spin' : ''}`} /> Atualizar cotações
          </Button>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="ABERTA">Posições abertas</TabsTrigger>
            <TabsTrigger value="FECHADA">Encerradas</TabsTrigger>
          </TabsList>
        </Tabs>

        {erroAcao && <p className="text-sm text-destructive">{erroAcao}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando operações...</p>
        ) : erro ? (
          <Card>
            <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" /> {erro}
            </CardContent>
          </Card>
        ) : grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {status === 'ABERTA' ? 'Nenhuma operação aberta neste perfil.' : 'Nenhuma operação encerrada neste perfil.'}
          </p>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <GrupoCompartilhado
                key={grupo.id}
                grupo={grupo}
                status={status}
                quotes={quotes}
                prevQuotes={prevQuotes}
                onEditar={setEditar}
                onEncerrar={setEncerrar}
              />
            ))}
            {dados?.has_more && (
              <p className="text-xs text-muted-foreground text-center">Mostrando as 500 operações mais recentes.</p>
            )}
          </div>
        )}
      </div>

      <EncerrarDialog operacao={encerrar} onClose={() => setEncerrar(null)} onConfirm={handleEncerrar} />
      <EditarOperacaoDialog operacao={editar} onClose={() => setEditar(null)} onSubmit={handleEditar} />
    </div>
  );
}