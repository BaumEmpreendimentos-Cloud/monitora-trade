import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Search, TrendingUp, Layers, Save, Lightbulb, Shield, LineChart as LineChartIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SalvarOperacaoDialog from '@/components/opcoes/SalvarOperacaoDialog';
import { businessDaysUntil } from '@/lib/operacoes';
import { calculatePortfolioGreeks } from '@/lib/blackScholes';
import PayoffChart from '@/components/opcoes/PayoffChart';
import PainelGreeks from '@/components/opcoes/PainelGreeks';
import PainelRiscoMargem from '@/components/opcoes/PainelRiscoMargem';
import { useToast } from '@/components/ui/use-toast';

const INTEREST_RATE = 0.1325;

// Converte legs do template (dueDate string) para legs com daysToExpiry
function templateLegsToSimLegs(legs, spotPrice) {
  return (legs || []).map((leg, i) => {
    const isStock = leg.type === 'STOCK';
    const dueDate = leg.dueDate && leg.dueDate !== 'À Vista' ? leg.dueDate : null;
    return {
      id: `sim-${Date.now()}-${i}`,
      type: leg.type,
      side: leg.side,
      quantity: leg.quantity || 100,
      strike: leg.strike || 0,
      premium: leg.premium || 0,
      ticker: leg.ticker || '',
      dueDate,
      daysToExpiry: isStock ? 999 : (dueDate ? businessDaysUntil(dueDate) ?? 0 : 30),
    };
  });
}

export default function SimuladorOperacoes({ initialLegs, initialSpotPrice, iv = 0.30, onSpotChange, strategyInfo, ativoBase, onEnviarParaAnalise }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [legs, setLegs] = useState(() => templateLegsToSimLegs(initialLegs, initialSpotPrice));
  const [saveOpen, setSaveOpen] = useState(false);
  const [spotPrice, setSpotPrice] = useState(initialSpotPrice || '');
  const [ivState, setIvState] = useState(iv);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSide, setSearchSide] = useState('BUY');
  const [searchQty, setSearchQty] = useState(100);
  const [searching, setSearching] = useState(false);

  // Atualiza legs quando initialLegs muda (ex: ao aplicar template)
  useEffect(() => {
    if (initialLegs) {
      setLegs(templateLegsToSimLegs(initialLegs, initialSpotPrice));
    }
  }, [initialLegs, initialSpotPrice]);

  // Spot price -> parent (para catálogo)
  useEffect(() => {
    if (onSpotChange) onSpotChange(Number(spotPrice) || 0);
  }, [spotPrice, onSpotChange]);

  const spot = Number(spotPrice) || 0;

  const greeks = useMemo(() => {
    if (!legs.length || !spot) return null;
    return calculatePortfolioGreeks(legs, spot, ivState, INTEREST_RATE);
  }, [legs, spot, ivState]);

  const handleAddLeg = (type, side = 'BUY') => {
    const isStock = type === 'STOCK';
    const newLeg = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      side,
      quantity: 100,
      strike: isStock ? 0 : (spot ? Math.round(spot) : 0),
      premium: isStock ? (spot || 0) : Number(((spot || 0) * 0.035).toFixed(2)),
      ticker: isStock ? '' : '',
      dueDate: null,
      daysToExpiry: isStock ? 999 : 30,
    };
    setLegs((p) => [...p, newLeg]);
  };

  const handleUpdateLeg = (index, updates) => {
    setLegs((p) => {
      const next = [...p];
      next[index] = { ...next[index], ...updates };
      if (updates.dueDate !== undefined) {
        next[index].daysToExpiry = next[index].type === 'STOCK' ? 999 : (updates.dueDate ? businessDaysUntil(updates.dueDate) ?? 0 : 0);
      }
      return next;
    });
  };

  const handleRemoveLeg = (index) => {
    setLegs((p) => p.filter((_, i) => i !== index));
  };

  const handleQtyChange = (index, delta) => {
    setLegs((p) => {
      const next = [...p];
      next[index] = { ...next[index], quantity: Math.max(0, (next[index].quantity || 0) + delta) };
      return next;
    });
  };

  // Auto-buscar cotação e dados do instrumento ao alterar o ticker de uma perna
  const [fetchingTicker, setFetchingTicker] = useState(null);
  const handleTickerBlur = async (index, ticker) => {
    const symbol = (ticker || '').trim().toUpperCase();
    if (!symbol || fetchingTicker === index) return;
    setFetchingTicker(index);
    try {
      const [qRes, sRes] = await Promise.all([
        base44.functions.invoke('oplabMarket', { action: 'quote', tickers: symbol }),
        base44.functions.invoke('oplabMarket', { action: 'search', expr: symbol, type: 'STOCK,OPTION', limit: 5 }),
      ]);
      const quote = qRes.data?.quotes?.[0];
      const results = sRes.data?.results || [];
      const match = results.find((r) => (r.symbol || r.ticker || '') === symbol) || results[0];

      // OpLab retorna type/close diretamente no objeto; strike e vencimento vêm na description
      const optType = match?.type || match?.add_info?.category || match?.add_info?.type || '';
      const premium = quote?.close || match?.close || match?.add_info?.close || 0;

      // Parse strike e vencimento da description: "ISHARES BOVACI, R$ 171.00, 16-10-2026"
      let strike = match?.add_info?.strike || 0;
      let dueDate = match?.add_info?.due_date || match?.add_info?.dueDate || null;
      const desc = match?.description || '';
      if (!strike) {
        const strikeMatch = desc.match(/R\$\s*([\d.]+(?:,\d+)?)(?=,|$)/);
        if (strikeMatch) {
          let s = strikeMatch[1];
          if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
          else if (s.includes(',')) s = s.replace(',', '.');
          strike = parseFloat(s) || 0;
        }
      }
      if (!dueDate) {
        const dateMatch = desc.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (dateMatch) dueDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }

      setLegs((p) => {
        const next = [...p];
        const leg = next[index];
        const isStock = leg.type === 'STOCK' || optType === 'STOCK';
        let updates = { premium };
        if (!isStock) {
          if (strike) updates.strike = strike;
          if (dueDate) {
            updates.dueDate = dueDate;
            updates.daysToExpiry = businessDaysUntil(dueDate) ?? 0;
          }
          if (optType === 'CALL' || optType === 'PUT') updates.type = optType;
        } else if (premium) {
          setSpotPrice(premium);
        }
        next[index] = { ...leg, ...updates };
        return next;
      });
    } catch (e) {
      /* ignore */
    } finally {
      setFetchingTicker(null);
    }
  };

  // Busca de instrumentos na B3
  const handleSearch = async () => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return;
    setSearching(true);
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'search', expr: term, type: 'STOCK,OPTION', limit: 10 });
      const results = res.data?.results || [];
      if (results.length > 0) {
        handleSelectResult(results[0]);
      } else {
        toast({ title: 'Código não encontrado', description: `O código "${term}" não existe ou está incorreto.`, variant: 'destructive' });
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (item) => {
    if (!item) return;
    const symbol = item.symbol || item.ticker || searchTerm;
    const type = (item.type === 'CALL' || item.type === 'PUT') ? item.type : 'STOCK';

    const desc = item.description || '';
    const strikeMatch = desc.match(/R\$\s*([\d.]+(?:,\d+)?)(?=,|$)/);
    let strike = 0;
    if (strikeMatch) {
      let s = strikeMatch[1];
      if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
      else if (s.includes(',')) s = s.replace(',', '.');
      strike = parseFloat(s) || 0;
    }
    const dateMatch = desc.match(/(\d{2})-(\d{2})-(\d{4})/);
    const dueDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
    const daysToExpiry = dueDate ? (businessDaysUntil(dueDate) ?? 0) : (type === 'STOCK' ? 999 : 30);
    const premium = item.close || 0;
    if (type === 'STOCK' && premium) setSpotPrice(premium);

    setLegs((p) => [...p, {
      id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      side: searchSide,
      quantity: searchQty,
      strike,
      premium,
      ticker: symbol,
      dueDate,
      daysToExpiry,
    }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Header do Simulador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border bg-card">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> {strategyInfo?.name || 'Simulador Livre de Operações'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {strategyInfo ? `Estratégia selecionada do catálogo` : 'Monte uma estrutura e verifique payoff, gregas, margem e risco antes de abrir a operação.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground uppercase">Spot (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={spotPrice}
              onChange={(e) => setSpotPrice(e.target.value)}
              placeholder="Ex: 38.50"
              className="h-8 w-28 text-sm"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground uppercase">IV (%)</Label>
            <Input
              type="number"
              step="1"
              value={Math.round(ivState * 100)}
              onChange={(e) => setIvState(Number(e.target.value) / 100)}
              className="h-8 w-16 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Dicas da estratégia */}
      {strategyInfo?.b3PracticalTips?.length > 0 && (
        <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Dicas Práticas — {strategyInfo.name}</span>
          </div>
          {strategyInfo.detailedDescription && (
            <p className="text-xs text-muted-foreground leading-relaxed">{strategyInfo.detailedDescription}</p>
          )}
          <div className="space-y-1">
            {strategyInfo.b3PracticalTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-foreground leading-relaxed">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
          {strategyInfo.marginRequirementB3 && (
            <div className="flex items-start gap-1.5 mt-1 p-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
              <Shield className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">{strategyInfo.marginRequirementB3}</span>
            </div>
          )}
        </div>
      )}

      {/* Busca & Adicionar */}
      <div className="p-4 rounded-xl border bg-card space-y-3" data-tour="sim-busca">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Buscar Opção na B3</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium">Auto-Preenchimento Inteligente</span>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="Ex: PETRJ390, VALEV600, BOVAK130..."
              className="pr-9"
            />
            <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" disabled={searching}>
              <Search className={`w-4 h-4 ${searching ? 'animate-spin' : ''}`} />
            </button>
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.symbol || item.ticker}
                    onClick={() => handleSelectResult(item)}
                    className="w-full px-3 py-2 text-left hover:bg-accent text-xs font-mono flex items-center justify-between border-b last:border-0"
                  >
                    <span className="font-bold text-primary">{item.symbol || item.ticker}</span>
                    <span className="text-[10px] text-muted-foreground">{item.description || item.type || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setSearchSide('BUY')} className={`px-3 py-1.5 text-xs font-bold rounded border ${searchSide === 'BUY' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border hover:bg-accent'}`}>COMPRA</button>
            <button onClick={() => setSearchSide('SELL')} className={`px-3 py-1.5 text-xs font-bold rounded border ${searchSide === 'SELL' ? 'bg-red-600 text-white border-red-600' : 'border-border hover:bg-accent'}`}>VENDA</button>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs whitespace-nowrap">Qtd:</Label>
            <Input type="number" value={searchQty} onChange={(e) => setSearchQty(Number(e.target.value) || 0)} className="h-8 w-20 text-sm" />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={searching || !searchTerm.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Buscar & Adicionar
          </Button>
        </div>
      </div>

      {/* Botões de adição rápida */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Pernas Ativas no Simulador ({legs.length})</span>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          <button onClick={() => handleAddLeg('CALL', 'BUY')} className="px-2.5 py-1.5 text-xs font-bold rounded border border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition">+ Call Compra</button>
          <button onClick={() => handleAddLeg('CALL', 'SELL')} className="px-2.5 py-1.5 text-xs font-bold rounded border border-red-500/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition">+ Call Venda</button>
          <button onClick={() => handleAddLeg('PUT', 'BUY')} className="px-2.5 py-1.5 text-xs font-bold rounded border border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition">+ Put Compra</button>
          <button onClick={() => handleAddLeg('PUT', 'SELL')} className="px-2.5 py-1.5 text-xs font-bold rounded border border-red-500/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition">+ Put Venda</button>
          <button onClick={() => handleAddLeg('STOCK', 'BUY')} className="px-2.5 py-1.5 text-xs font-bold rounded border border-sky-500/40 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition">+ Ação (Spot)</button>
        </div>
      </div>

      {/* Tabela de pernas */}
      {legs.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b">
              <tr>
                <th className="px-3 py-2.5">Sentido</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Ticker / Código B3</th>
                <th className="px-3 py-2.5 text-right">Strike (R$)</th>
                <th className="px-3 py-2.5 text-right">Prêmio (R$)</th>
                <th className="px-3 py-2.5 text-right">Qtd</th>
                <th className="px-3 py-2.5 text-right">Venc. (d.u.)</th>
                <th className="px-3 py-2.5 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {legs.map((leg, index) => {
                const isStock = leg.type === 'STOCK';
                return (
                  <tr key={leg.id} className="hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <select
                        value={leg.side}
                        onChange={(e) => handleUpdateLeg(index, { side: e.target.value })}
                        className={`px-2 py-1 rounded text-xs font-bold border ${leg.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30'}`}
                      >
                        <option value="BUY">COMPRA</option>
                        <option value="SELL">VENDA</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${isStock ? 'text-sky-600 bg-sky-500/10' : leg.type === 'CALL' ? 'text-emerald-600 bg-emerald-500/10' : 'text-amber-600 bg-amber-500/10'}`}>{leg.type}</span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={leg.ticker}
                        onChange={(e) => handleUpdateLeg(index, { ticker: e.target.value.toUpperCase() })}
                        onBlur={(e) => handleTickerBlur(index, e.target.value)}
                        className={`w-28 px-2 py-1 bg-background border rounded font-bold focus:outline-none focus:border-primary ${fetchingTicker === index ? 'opacity-50' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isStock ? <span className="text-muted-foreground">—</span> : (
                        <input type="number" step="0.25" value={leg.strike} onChange={(e) => handleUpdateLeg(index, { strike: parseFloat(e.target.value) || 0 })} className="w-20 px-2 py-1 bg-background border rounded text-right focus:outline-none focus:border-primary" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" step="0.01" value={leg.premium} onChange={(e) => handleUpdateLeg(index, { premium: parseFloat(e.target.value) || 0 })} className="w-20 px-2 py-1 bg-background border rounded text-right text-emerald-600 font-bold focus:outline-none focus:border-primary" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <input type="number" step="100" value={leg.quantity} onChange={(e) => handleUpdateLeg(index, { quantity: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1 bg-background border rounded text-right focus:outline-none focus:border-primary" />
                        <div className="flex gap-0.5">
                          <button onClick={() => handleQtyChange(index, -1000)} className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition" title="-1.000">-1k</button>
                          <button onClick={() => handleQtyChange(index, -100)} className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition" title="-100">-100</button>
                          <button onClick={() => handleQtyChange(index, 100)} className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition" title="+100">+100</button>
                          <button onClick={() => handleQtyChange(index, 1000)} className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition" title="+1.000">+1k</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isStock ? <span className="text-muted-foreground">À Vista</span> : (
                        <div className="flex flex-col gap-0.5">
                          <input type="date" value={leg.dueDate || ''} onChange={(e) => handleUpdateLeg(index, { dueDate: e.target.value })} className="px-1 py-1 bg-background border rounded text-xs focus:outline-none focus:border-primary" />
                          <span className="text-[10px] text-muted-foreground">{leg.daysToExpiry} d.u.</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleRemoveLeg(index)} className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-500/10" title="Remover perna">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 rounded-xl border bg-card text-center">
          <p className="text-sm text-muted-foreground">Nenhuma perna no simulador. Use a busca acima ou adicione pernas manualmente.</p>
        </div>
      )}

      {/* Payoff + Gregas + Risco/Margem */}
      {legs.length > 0 && spot > 0 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border bg-card" data-tour="sim-payoff">
            <PayoffChart legs={legs} spotPrice={spot} iv={ivState} interestRate={INTEREST_RATE} ticker={legs[0]?.ticker || ''} />
          </div>
          {greeks && (
            <div data-tour="sim-gregas">
              <h3 className="text-sm font-semibold mb-2">Gregas do Portfólio</h3>
              <PainelGreeks greeks={greeks} />
            </div>
          )}
          <PainelRiscoMargem legs={legs} spotPrice={spot} />
        </div>
      )}

      {legs.length > 0 && spot === 0 && (
        <p className="text-sm text-amber-600 text-center py-4">Informe o preço spot (Spot) para calcular payoff e margem.</p>
      )}

      {/* Salvar como Operação / Enviar para Análise */}
      {legs.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button onClick={() => onEnviarParaAnalise?.(legs, spot, ativoBase)} variant="outline" className="gap-2">
            <LineChartIcon className="w-4 h-4" /> Enviar para Análise de Posição
          </Button>
          <Button onClick={() => setSaveOpen(true)} className="gap-2" data-tour="sim-salvar">
            <Save className="w-4 h-4" /> Salvar como Operação
          </Button>
        </div>
      )}

      <SalvarOperacaoDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        legs={legs}
        ativoBase={ativoBase || ''}
        defaultName={strategyInfo?.name || ''}
        onSaved={() => navigate('/operacoes')}
      />
    </div>
  );
}