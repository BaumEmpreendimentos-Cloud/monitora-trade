import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { calcResultadoValor, calcResultadoOpcaoUnderlying } from '@/lib/operacoes';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const isOption = (c) => c === 'CALL' || c === 'PUT';

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function cellColor(distance) {
  const blue = [30, 64, 175];
  const red = [220, 38, 38];
  return `rgb(${lerp(blue[0], red[0], distance)}, ${lerp(blue[1], red[1], distance)}, ${lerp(blue[2], red[2], distance)})`;
}

function mostCommon(arr) {
  const freq = {};
  let best = null; let max = 0;
  arr.forEach((x) => { freq[x] = (freq[x] || 0) + 1; if (freq[x] > max) { max = freq[x]; best = x; } });
  return max > 0 ? best : null;
}

export default function MapaCalorGrupo({ operacoes, quotes }) {
  const [percent, setPercent] = useState(2);
  const [expanded, setExpanded] = useState(true);

  const referencia = useMemo(() => {
    const bases = operacoes.filter((o) => isOption(o.categoria)).map((o) => o.ativo_base).filter(Boolean);
    const ativos = operacoes.map((o) => o.ativo);
    return mostCommon(bases) || mostCommon(ativos) || ativos[0];
  }, [operacoes]);

  const currentPrice = quotes[referencia];

  if (currentPrice == null || currentPrice === '') {
    return (
      <div className="border-t bg-muted/30 p-3 text-sm text-muted-foreground">
        Sem cotação do ativo de referência ({referencia}) para gerar o mapa de calor do grupo.
      </div>
    );
  }

  const price = Number(currentPrice);
  const step = price * (percent / 100);
  const indices = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  const totalPnl = (percentMove) => operacoes.reduce((sum, o) => {
    if (isOption(o.categoria)) {
      const basePrice = quotes[o.ativo_base];
      if (basePrice == null || basePrice === '') return sum;
      const scenario = Number(basePrice) * (1 + percentMove);
      const r = calcResultadoOpcaoUnderlying(o.categoria, o.operacao, o.strike, o.preco_entrada, o.quantidade, scenario);
      return sum + (r || 0);
    }
    const ownPrice = quotes[o.ativo];
    if (ownPrice == null || ownPrice === '') return sum;
    const scenario = Number(ownPrice) * (1 + percentMove);
    const r = calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, scenario);
    return sum + (r || 0);
  }, 0);

  const points = indices.map((i) => ({ i, pricePoint: price + step * i, percentMove: (i * percent) / 100 }));

  return (
    <div className="border-t bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1 text-sm font-medium hover:text-primary">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Mapa de Calor do Grupo — referência: {referencia}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Variação por passo:</span>
          <Select value={String(percent)} onValueChange={(v) => setPercent(Number(v))}>
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}%</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {expanded && (
        <div className="space-y-1">
          <div className="grid grid-cols-11 gap-0.5">
            {points.map((p) => (
              <div key={p.i} className={`text-center text-xs py-1 rounded ${p.i === 0 ? 'bg-primary text-primary-foreground font-bold' : 'bg-card border'}`}>
                {fmt(p.pricePoint)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-11 gap-0.5">
            {points.map((p) => {
              const distance = Math.abs(p.i) / 5;
              const pnl = totalPnl(p.percentMove);
              return (
                <div key={p.i} className="text-center text-white py-2 rounded text-xs" style={{ backgroundColor: cellColor(distance) }}>
                  <div className="font-semibold">{fmt(pnl)}</div>
                  <div className="text-[10px] opacity-80">{p.i === 0 ? 'atual' : `${p.i > 0 ? '+' : ''}${p.i}`}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>◀ Preço cai</span>
            <span>Resultado total (R$) do grupo por cenário — cada ativo move pelo mesmo %</span>
            <span>Preço sobe ▶</span>
          </div>
        </div>
      )}
    </div>
  );
}