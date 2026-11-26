import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Search, BarChart3, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ExpirationBar from '@/components/rolagem/ExpirationBar';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtInt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' || Number.isNaN(v) ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined || Number.isNaN(v) ? '' : v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : '');

const STORAGE_KEY = 'rolagem_state';

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
};

export default function Rolagem() {
  const saved = loadSaved();
  const urlParams = new URLSearchParams(window.location.search);
  const ativoFromUrl = urlParams.get('ativo');
  const [ativoBase, setAtivoBase] = useState(ativoFromUrl || saved?.ativoBase || '');
  const [ativoBuscado, setAtivoBuscado] = useState(ativoFromUrl || saved?.ativoBuscado || '');
  const [options, setOptions] = useState([]);
  const [spotPrice, setSpotPrice] = useState(null);
  const [userOps, setUserOps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tipo, setTipo] = useState(saved?.tipo || 'CALL');
  const [strikeMin, setStrikeMin] = useState(saved?.strikeMin ?? '');
  const [strikeMax, setStrikeMax] = useState(saved?.strikeMax ?? '');
  const [expLeft, setExpLeft] = useState(saved?.expLeft || null);
  const [expRight, setExpRight] = useState(saved?.expRight || null);
  const [excluidos, setExcluidos] = useState(saved?.excluidos || []);
  const [ocultarExcluidas, setOcultarExcluidas] = useState(false);
  const isInitialMount = useRef(true);

  const loadUserOps = useCallback(async () => {
    try {
      const o = await base44.entities.Operacao.list('-created_date', 5000);
      setUserOps((o || []).filter((x) => x.status === 'ABERTA'));
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { loadUserOps(); }, [loadUserOps]);

  // Auto-buscar cadeia ao montar se houver ativo salvo
  useEffect(() => {
    if (ativoBuscado) fetchChain(ativoBuscado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir seleções no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ativoBase, ativoBuscado, tipo, strikeMin, strikeMax, expLeft, expRight, excluidos }));
    } catch (e) { /* ignore */ }
  }, [ativoBase, ativoBuscado, tipo, strikeMin, strikeMax, expLeft, expRight, excluidos]);

  const fetchChain = useCallback(async (symbol) => {
    if (!symbol) return;
    setLoading(true); setError('');
    try {
      const [chainRes, quoteRes] = await Promise.all([
        base44.functions.invoke('oplabMarket', { action: 'optionChain', symbol }),
        base44.functions.invoke('oplabMarket', { action: 'quote', tickers: symbol }),
      ]);
      const opts = chainRes.data?.options || [];
      setOptions(opts);
      const q = quoteRes.data?.quotes || [];
      setSpotPrice(q[0]?.close ?? null);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setOptions([]);
      setSpotPrice(null);
    } finally { setLoading(false); }
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    const sym = ativoBase.trim().toUpperCase();
    if (!sym) return;
    setAtivoBuscado(sym);
    fetchChain(sym);
  };

  // Lista de todos os exercícios disponíveis (com dias até vencimento)
  const todasExpiracoes = useMemo(() => {
    const filtered = options.filter((o) => o.type === tipo && o.due_date);
    const map = {};
    filtered.forEach((o) => {
      if (!map[o.due_date]) map[o.due_date] = o.days_to_maturity;
    });
    return Object.entries(map)
      .map(([date, days]) => ({ date, days }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [options, tipo]);

  // Auto-selecionar os 2 primeiros exercícios quando dados carregarem
  useEffect(() => {
    if (todasExpiracoes.length >= 2 && !expLeft && !expRight) {
      setExpLeft(todasExpiracoes[0].date);
      setExpRight(todasExpiracoes[1].date);
    }
    if (todasExpiracoes.length === 1 && !expLeft) {
      setExpLeft(todasExpiracoes[0].date);
    }
  }, [todasExpiracoes, expLeft, expRight]);

  // Reset seleção ao trocar de ativo ou tipo (pula o mount inicial para preservar valores restaurados)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setExpLeft(null);
    setExpRight(null);
  }, [ativoBuscado, tipo]);

  const handleSelectExpiration = useCallback((date) => {
    if (date === expLeft) {
      // Deselecionar esquerda; promover direita
      setExpLeft(expRight);
      setExpRight(null);
    } else if (date === expRight) {
      // Deselecionar direita
      setExpRight(null);
    } else if (!expLeft) {
      setExpLeft(date);
    } else if (!expRight) {
      // Garantir ordem cronológica
      if (date < expLeft) {
        setExpRight(expLeft);
        setExpLeft(date);
      } else {
        setExpRight(date);
      }
    } else {
      // Ambos preenchidos: substituir o mais antigo (esquerda)
      setExpLeft(expRight);
      setExpRight(date);
    }
  }, [expLeft, expRight]);

  // Derivar pares de rolagem com base nos exercícios selecionados
  const pares = useMemo(() => {
    if (!options.length || !expLeft || !expRight) return [];
    const filtered = options.filter((o) => o.type === tipo && o.due_date && o.strike != null);

    const byExpStrike = {};
    filtered.forEach((o) => {
      const key = `${o.due_date}_${o.strike}`;
      byExpStrike[key] = o;
    });

    const strikesLeft = new Set(filtered.filter((o) => o.due_date === expLeft).map((o) => o.strike));
    const strikesRight = new Set(filtered.filter((o) => o.due_date === expRight).map((o) => o.strike));
    const commonStrikes = [...strikesLeft].filter((s) => strikesRight.has(s)).sort((a, b) => a - b);

    const min = strikeMin !== '' ? Number(strikeMin) : null;
    const max = strikeMax !== '' ? Number(strikeMax) : null;
    const strikeFiltered = commonStrikes.filter((s) => (min === null || s >= min) && (max === null || s <= max));

    return strikeFiltered.map((strike) => ({
      strike,
      left: byExpStrike[`${expLeft}_${strike}`],
      right: byExpStrike[`${expRight}_${strike}`],
    })).filter((p) => p.left && p.right);
  }, [options, tipo, expLeft, expRight, strikeMin, strikeMax]);

  // Chave única de cada perna de rolagem (ativo + vencimentos + strike)
  const rowKeyFor = useCallback(
    (strike) => `${ativoBuscado}|${tipo}|${expLeft}|${expRight}|${strike}`,
    [ativoBuscado, tipo, expLeft, expRight]
  );

  const toggleExcluida = useCallback((strike) => {
    const k = rowKeyFor(strike);
    setExcluidos((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }, [rowKeyFor]);

  const restaurarTodas = () => setExcluidos([]);

  const excluidasCount = useMemo(
    () => pares.filter((p) => excluidos.includes(rowKeyFor(p.strike))).length,
    [pares, excluidos, rowKeyFor]
  );

  const paresExibidos = useMemo(
    () => (ocultarExcluidas ? pares.filter((p) => !excluidos.includes(rowKeyFor(p.strike))) : pares),
    [pares, ocultarExcluidas, excluidos, rowKeyFor]
  );

  // Map de tickers que o usuário possui (com quantidade líquida por ticker)
  const ownedMap = useMemo(() => {
    const map = {};
    userOps.forEach((o) => {
      if (!o.ativo) return;
      const dir = o.operacao === 'COMPRA' ? 1 : -1;
      map[o.ativo] = (map[o.ativo] || 0) + dir * (o.quantidade || 0);
    });
    return map;
  }, [userOps]);

  const isOwned = (ticker) => ticker && ownedMap[ticker] !== undefined && ownedMap[ticker] !== 0;
  const ownedQty = (ticker) => (ticker ? (ownedMap[ticker] || 0) : 0);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Painel de Rolagem</h1>
            <p className="text-sm text-muted-foreground">Cadeia de opções — selecione os vencimentos para comparar</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && <span className="text-xs text-muted-foreground">Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>}
            <Link to="/opcoes"><Button variant="outline" size="sm"><BarChart3 className="w-4 h-4 mr-1" /> Análise de Opções</Button></Link>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ativo">Ativo Base</Label>
                <div className="flex gap-2">
                  <Input id="ativo" value={ativoBase} onChange={(e) => setAtivoBase(e.target.value.toUpperCase())} placeholder="Ex: BOVA11, PETR4..." className="uppercase" />
                  <Button type="submit" disabled={loading || !ativoBase.trim()}><Search className="w-4 h-4 mr-1" /> Buscar</Button>
                </div>
              </div>
            </form>

            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Tipo:</Label>
                <div className="flex rounded-md border overflow-hidden">
                  <button type="button" onClick={() => setTipo('CALL')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tipo === 'CALL' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>CALL</button>
                  <button type="button" onClick={() => setTipo('PUT')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tipo === 'PUT' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>PUT</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Strike mín:</Label>
                <Input type="number" value={strikeMin} onChange={(e) => setStrikeMin(e.target.value)} placeholder="0" className="w-24" />
                <Label className="text-xs">máx:</Label>
                <Input type="number" value={strikeMax} onChange={(e) => setStrikeMax(e.target.value)} placeholder="∞" className="w-24" />
              </div>
              {ativoBuscado && (
                <Button variant="outline" size="sm" onClick={() => fetchChain(ativoBuscado)} disabled={loading} className="md:ml-auto">
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {ativoBuscado && (
          <>
            {/* Header com ativo, preço, hora e data */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase opacity-80">{ativoBuscado}</div>
                  <div className="text-xl md:text-2xl font-bold">{spotPrice != null ? fmt(spotPrice) : '—'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase text-muted-foreground">Hora</div>
                  <div className="text-xl md:text-2xl font-bold">{lastUpdate ? lastUpdate.toLocaleTimeString('pt-BR') : '—'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase text-muted-foreground">Data</div>
                  <div className="text-xl md:text-2xl font-bold">{new Date().toLocaleDateString('pt-BR')}</div>
                </CardContent>
              </Card>
            </div>

            {!loading && todasExpiracoes.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Selecione os vencimentos:</span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="inline-block w-3 h-3 rounded bg-primary" />
                      <span className="text-muted-foreground">Venc 1</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="inline-block w-3 h-3 rounded bg-teal-600" />
                      <span className="text-muted-foreground">Venc 2</span>
                    </span>
                  </div>
                  <ExpirationBar
                    expiracoes={todasExpiracoes}
                    expLeft={expLeft}
                    expRight={expRight}
                    onSelect={handleSelectExpiration}
                  />
                </CardContent>
              </Card>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-10">Carregando opções...</p>
            ) : !expLeft || !expRight ? (
              <p className="text-sm text-muted-foreground text-center py-10">Selecione dois vencimentos acima para comparar as rolagens.</p>
            ) : pares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma opção encontrada para os filtros selecionados.</p>
            ) : paresExibidos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Todas as pernas foram excluídas da rolagem. Use "Mostrar" para exibi-las ou "Restaurar todas".
              </p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[calc(100vh-22rem)]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-muted text-xs text-muted-foreground uppercase">
                          <th rowSpan={2} className="p-2 text-center border-r align-middle" style={{ borderColor: 'hsl(var(--border))' }}>
                            Rolar
                          </th>
                          <th colSpan={3} className="p-2 text-center border-r" style={{ borderColor: 'hsl(var(--border))' }}>
                            Vencimento 1<br/>{expLeft ? new Date(expLeft + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </th>
                          <th colSpan={3} className="p-2 text-center border-r" style={{ borderColor: 'hsl(var(--border))' }}>
                            Vencimento 2<br/>{expRight ? new Date(expRight + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </th>
                          <th colSpan={4} className="p-2 text-center">Rolagem</th>
                        </tr>
                        <tr className="bg-muted/70 text-xs text-muted-foreground uppercase">
                          <th className="text-left p-2">Ticker</th>
                          <th className="text-right p-2">Preço</th>
                          <th className="text-right p-2 border-r" style={{ borderColor: 'hsl(var(--border))' }}>Strike</th>
                          <th className="text-left p-2">Ticker</th>
                          <th className="text-right p-2">Preço</th>
                          <th className="text-right p-2 border-r" style={{ borderColor: 'hsl(var(--border))' }}>Strike</th>
                          <th className="text-right p-2">Rolagem</th>
                          <th className="text-right p-2">Qtd Redu</th>
                          <th className="text-right p-2">% Redu</th>
                          <th className="text-right p-2">Δ %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paresExibidos.map((p) => {
                          const excluida = excluidos.includes(rowKeyFor(p.strike));
                          const leftPrice = p.left?.close;
                          const rightPrice = p.right?.close;
                          const rolagem = (leftPrice != null && rightPrice != null) ? rightPrice - leftPrice : null;
                          const deltaPct = (leftPrice != null && rightPrice != null && leftPrice !== 0) ? ((rightPrice - leftPrice) / leftPrice) * 100 : null;

                          const ownedLeft = isOwned(p.left?.symbol);
                          const ownedRight = isOwned(p.right?.symbol);
                          const owned = ownedLeft || ownedRight;
                          const qty = ownedQty(p.left?.symbol) || ownedQty(p.right?.symbol) || 0;

                          let qtdRedu = null;
                          let pctRedu = null;
                          if (owned && qty !== 0 && leftPrice != null && rightPrice != null && rightPrice > 0) {
                            const absQty = Math.abs(qty);
                            const newQty = Math.floor(absQty * leftPrice / rightPrice);
                            qtdRedu = absQty - newQty;
                            pctRedu = (qtdRedu / absQty) * 100;
                          }

                          return (
                            <tr key={p.strike} className={`border-t hover:bg-accent/30 ${excluida ? 'opacity-45' : ''} ${owned && !excluida ? 'bg-amber-100 dark:bg-amber-900/40 ring-1 ring-inset ring-amber-400 dark:ring-amber-500' : ''}`}>
                              <td className="p-2 text-center border-r" style={{ borderColor: 'hsl(var(--border))' }}>
                                <Checkbox
                                  checked={!excluida}
                                  onCheckedChange={() => toggleExcluida(p.strike)}
                                  title={excluida ? 'Incluir esta perna na rolagem' : 'Excluir esta perna da rolagem'}
                                />
                              </td>
                              <td className="p-2 font-medium whitespace-nowrap">
                                {ownedLeft && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-xs font-bold mr-1.5 align-middle">★</span>}
                                {p.left?.symbol || '—'}
                              </td>
                              <td className="p-2 text-right">{fmt(leftPrice)}</td>
                              <td className="p-2 text-right border-r" style={{ borderColor: 'hsl(var(--border))' }}>{fmtInt(p.strike)}</td>
                              <td className="p-2 font-medium whitespace-nowrap">
                                {ownedRight && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-xs font-bold mr-1.5 align-middle">★</span>}
                                {p.right?.symbol || '—'}
                              </td>
                              <td className="p-2 text-right">{fmt(rightPrice)}</td>
                              <td className="p-2 text-right border-r" style={{ borderColor: 'hsl(var(--border))' }}>{fmtInt(p.strike)}</td>
                              <td className={`p-2 text-right font-medium ${color(rolagem)}`}>{fmt(rolagem)}</td>
                              <td className="p-2 text-right">{qtdRedu != null ? fmtInt(qtdRedu) : '—'}</td>
                              <td className="p-2 text-right">{pctRedu != null ? fmtPct(pctRedu) : '—'}</td>
                              <td className={`p-2 text-right ${color(deltaPct)}`}>{fmtPct(deltaPct)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-xs font-bold">★</span>
                Opções que você possui neste ativo
              </div>
              {excluidasCount > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {excluidasCount} {excluidasCount === 1 ? 'perna excluída' : 'pernas excluídas'} da rolagem
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setOcultarExcluidas((v) => !v)}>
                    {ocultarExcluidas
                      ? <><Eye className="w-3.5 h-3.5 mr-1" /> Mostrar</>
                      : <><EyeOff className="w-3.5 h-3.5 mr-1" /> Ocultar</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={restaurarTodas}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar todas
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}