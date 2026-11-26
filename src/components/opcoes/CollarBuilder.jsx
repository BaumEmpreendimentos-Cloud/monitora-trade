import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X, Wand2, PencilLine, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/MobileSelect';
import CollarResumo from '@/components/opcoes/CollarResumo';
import { getOptionChain } from '@/lib/monitora-ai/marketEngine';
import {
  META_COLLAR_PADRAO,
  vencimentosMensais,
  opcoesPorTipo,
  buscarMontagens,
  analisarCollar,
  legsDoCollar,
} from '@/lib/collar';

const brl = (v) => (Number.isFinite(Number(v))
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : '—');

const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

const numeroOu = (valor, fallback) => (valor !== '' && Number.isFinite(Number(valor)) ? Number(valor) : fallback);

export default function CollarBuilder({ ativoBase, spotPrice, onEnviarParaSimulador, onClose }) {
  const spot = Number(spotPrice) || 0;
  const [chain, setChain] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [vencimento, setVencimento] = useState('');
  const [modo, setModo] = useState('AUTO');
  const [metaValor, setMetaValor] = useState(String(META_COLLAR_PADRAO.valor));
  const [metaUnidade, setMetaUnidade] = useState(META_COLLAR_PADRAO.unidade);
  const [quantidade, setQuantidade] = useState(100);
  const [candidatos, setCandidatos] = useState([]);
  const [buscou, setBuscou] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [callSymbol, setCallSymbol] = useState('');
  const [putSymbol, setPutSymbol] = useState('');
  const [premioCall, setPremioCall] = useState('');
  const [premioPut, setPremioPut] = useState('');

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setChain([]);
    setVencimento('');
    setCandidatos([]);
    setSelecionada(null);
    setBuscou(false);
    if (!ativoBase) {
      setCarregando(false);
      return () => { vivo = false; };
    }
    getOptionChain(ativoBase).then((lista) => {
      if (!vivo) return;
      setChain(lista);
      setVencimento(vencimentosMensais(lista)[0] || '');
    }).finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [ativoBase]);

  const vencimentos = useMemo(() => vencimentosMensais(chain), [chain]);
  const calls = useMemo(() => opcoesPorTipo(chain, 'CALL', vencimento).filter((o) => o.strike > spot), [chain, vencimento, spot]);
  const puts = useMemo(() => opcoesPorTipo(chain, 'PUT', vencimento), [chain, vencimento]);

  const meta = { valor: Number(metaValor) || 0, unidade: metaUnidade };

  useEffect(() => {
    setCandidatos([]);
    setSelecionada(null);
    setBuscou(false);
  }, [vencimento, metaValor, metaUnidade, quantidade]);

  useEffect(() => {
    if (!calls.length) { setCallSymbol(''); setPremioCall(''); return; }
    if (!calls.some((c) => c.symbol === callSymbol)) {
      setCallSymbol(calls[0].symbol);
      setPremioCall(String(calls[0].premium));
    }
  }, [calls, callSymbol]);

  useEffect(() => {
    if (!puts.length) { setPutSymbol(''); setPremioPut(''); return; }
    if (!puts.some((p) => p.symbol === putSymbol)) {
      const proxima = puts.reduce((melhor, o) => (Math.abs(o.strike - spot) < Math.abs(melhor.strike - spot) ? o : melhor), puts[0]);
      setPutSymbol(proxima.symbol);
      setPremioPut(String(proxima.premium));
    }
  }, [puts, putSymbol, spot]);

  const callManual = calls.find((c) => c.symbol === callSymbol);
  const putManual = puts.find((p) => p.symbol === putSymbol);

  const estrutura = modo === 'AUTO'
    ? selecionada
    : (callManual && putManual ? {
      dueDate: vencimento,
      call: { ...callManual, premium: numeroOu(premioCall, callManual.premium) },
      put: { ...putManual, premium: numeroOu(premioPut, putManual.premium) },
    } : null);

  const buscar = () => {
    const lista = buscarMontagens({ chain, spot, dueDate: vencimento, meta, quantidade, limite: 8 });
    setCandidatos(lista);
    setBuscou(true);
    setSelecionada(lista[0] || null);
  };

  const enviar = () => {
    if (!estrutura) return;
    onEnviarParaSimulador(legsDoCollar({
      ativoBase,
      spot,
      call: estrutura.call,
      put: estrutura.put,
      quantidade,
    }));
  };

  const opcoesVencimento = vencimentos.map((d) => ({ value: d, label: dataBr(d) }));
  const opcoesCall = calls.map((c) => ({
    value: c.symbol,
    label: `${c.symbol} · strike ${brl(c.strike)} · prêmio ${brl(c.premium)}`,
  }));
  const opcoesPut = puts.map((p) => ({
    value: p.symbol,
    label: `${p.symbol} · strike ${brl(p.strike)} · prêmio ${brl(p.premium)}`,
  }));

  return (
    <div id="collar-builder" className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
        <div>
          <h2 className="font-heading text-base font-bold">Collar Tradicional</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ação comprada + CALL vendida + PUT comprada, montado numa faixa que gera ganho mesmo na queda.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar montagem">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase">Ativo</Label>
            <div className="h-9 px-3 flex items-center rounded-md border bg-muted font-mono font-bold text-sm">
              {ativoBase || '—'} {spot > 0 ? `· ${brl(spot)}` : ''}
            </div>
          </div>
          <div className="space-y-1 min-w-[10rem]">
            <Label className="text-xs text-muted-foreground uppercase">Vencimento</Label>
            <MobileSelect
              value={vencimento}
              onValueChange={setVencimento}
              options={opcoesVencimento}
              placeholder="Vencimento"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase">Quantidade</Label>
            <Input
              type="number"
              step="100"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="h-9 w-28 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase">Lucro mínimo na queda</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="0.1"
                value={metaValor}
                onChange={(e) => setMetaValor(e.target.value)}
                className="h-9 w-24 text-sm"
              />
              <div className="w-24">
                <MobileSelect
                  value={metaUnidade}
                  onValueChange={setMetaUnidade}
                  options={[{ value: '%', label: '%' }, { value: 'R$', label: 'R$' }]}
                  placeholder="Unidade"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModo('AUTO')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${modo === 'AUTO' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
          >
            <Wand2 className="w-3.5 h-3.5" /> Automático
          </button>
          <button
            type="button"
            onClick={() => setModo('MANUAL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${modo === 'MANUAL' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
          >
            <PencilLine className="w-3.5 h-3.5" /> Manual
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando cadeia de {ativoBase}...
          </div>
        ) : !chain.length ? (
          <p className="flex items-start gap-1.5 text-sm text-amber-700 bg-amber-50/60 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            A OpLab não retornou a cadeia de {ativoBase}. Confirme o código do ativo e tente novamente.
          </p>
        ) : !vencimento ? (
          <p className="text-sm text-muted-foreground">Nenhum vencimento mensal disponível para montar o collar.</p>
        ) : spot <= 0 ? (
          <p className="text-sm text-amber-700">Informe o ativo base e busque o spot acima para montar o collar.</p>
        ) : modo === 'AUTO' ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={buscar} className="gap-1.5">
                <Search className="w-3.5 h-3.5" /> Buscar montagens
              </Button>
              <span className="text-xs text-muted-foreground">
                Encontra CALL vendida e PUT comprada que atinjam a meta na queda.
              </span>
            </div>

            {buscou && !candidatos.length && (
              <p className="text-sm text-amber-700 bg-amber-50/60 border border-amber-200 rounded-lg px-3 py-2">
                Nenhuma montagem atinge a meta neste vencimento. Reduza o lucro mínimo ou escolha outro vencimento.
              </p>
            )}

            {candidatos.map((c, i) => {
              const ativa = selecionada && selecionada.call.symbol === c.call.symbol && selecionada.put.symbol === c.put.symbol;
              return (
                <button
                  key={`${c.call.symbol}-${c.put.symbol}-${i}`}
                  type="button"
                  onClick={() => setSelecionada(c)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition ${ativa ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card hover:bg-accent/50'}`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">CALL vendida</div>
                      <div className="font-semibold tabular-nums">{brl(c.call.strike)} · {brl(c.call.premium)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PUT comprada</div>
                      <div className="font-semibold tabular-nums">{brl(c.put.strike)} · {brl(c.put.premium)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Queda até {brl(c.put.strike)}</div>
                      <div className={`font-semibold tabular-nums ${c.resultadoQueda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {c.resultadoQueda >= 0 ? '+' : ''}{brl(c.resultadoQueda)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Alta a partir de {brl(c.call.strike)}</div>
                      <div className={`font-semibold tabular-nums ${c.resultadoAlta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {c.resultadoAlta >= 0 ? '+' : ''}{brl(c.resultadoAlta)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">CALL vendida</Label>
              <MobileSelect
                value={callSymbol}
                onValueChange={(v) => {
                  setCallSymbol(v);
                  setPremioCall(String(calls.find((c) => c.symbol === v)?.premium ?? ''));
                }}
                options={opcoesCall}
                placeholder="Escolher CALL"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prêmio (R$)</span>
                <Input
                  type="number"
                  step="0.01"
                  value={premioCall}
                  onChange={(e) => setPremioCall(e.target.value)}
                  className="h-8 w-24 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">PUT comprada</Label>
              <MobileSelect
                value={putSymbol}
                onValueChange={(v) => {
                  setPutSymbol(v);
                  setPremioPut(String(puts.find((p) => p.symbol === v)?.premium ?? ''));
                }}
                options={opcoesPut}
                placeholder="Escolher PUT"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prêmio (R$)</span>
                <Input
                  type="number"
                  step="0.01"
                  value={premioPut}
                  onChange={(e) => setPremioPut(e.target.value)}
                  className="h-8 w-24 text-sm"
                />
              </div>
            </div>
            {(!callManual || !putManual) && (
              <p className="md:col-span-2 text-xs text-muted-foreground">
                Selecione uma CALL e uma PUT do mesmo vencimento para montar a estrutura.
              </p>
            )}
            {callManual && putManual && analisarCollar({
              spot,
              callStrike: callManual.strike,
              callPremium: numeroOu(premioCall, callManual.premium),
              putStrike: putManual.strike,
              putPremium: numeroOu(premioPut, putManual.premium),
              quantidade,
            }).desembolso <= 0 && (
              <p className="md:col-span-2 text-xs text-red-600">
                Prêmios líquidos acima do preço do ativo: revise os valores da montagem.
              </p>
            )}
          </div>
        )}

        {estrutura && spot > 0 && (
          <CollarResumo
            ativoBase={ativoBase}
            spot={spot}
            estrutura={estrutura}
            quantidade={quantidade}
            meta={meta}
          />
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Estimativas no vencimento, sem custos. Nenhuma ordem é enviada.
          </span>
          <Button size="sm" onClick={enviar} disabled={!estrutura} className="gap-1.5">
            Enviar ao Simulador <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}