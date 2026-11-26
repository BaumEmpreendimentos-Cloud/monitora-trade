import React, { useState } from 'react';
import { Newspaper, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

const CATEGORIAS = ['Todas', 'B3', 'Macro Brasil', 'Eleições & Política', 'Commodities', 'Global/Wall St'];

function SentimentBadge({ sentimento, score }) {
  if (sentimento === 'bullish') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"><TrendingUp className="w-3 h-3" /> Bullish ({score > 0 ? '+' : ''}{score})</span>;
  }
  if (sentimento === 'bearish') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/30"><TrendingDown className="w-3 h-3" /> Bearish ({score})</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border"><Minus className="w-3 h-3" /> Neutro ({score > 0 ? `+${score}` : score})</span>;
}

export default function QuadroNoticias({ perspectiva }) {
  const [categoria, setCategoria] = useState('Todas');
  const noticias = perspectiva.noticias || [];
  const filtradas = categoria === 'Todas' ? noticias : noticias.filter((n) => n.categoria === categoria);

  if (!noticias.length) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b">
        <Newspaper className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Notícias do Mercado</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${categoria === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtradas.map((item, i) => (
          <div key={i} className="border rounded-xl p-4 hover:bg-accent/30 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">{item.categoria}</span>
                <span className="text-muted-foreground font-mono">{item.fonte}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{item.tempo}</span>
              </div>
              <SentimentBadge sentimento={item.sentimento} score={item.score} />
            </div>
            <h4 className="text-sm font-bold mb-1 leading-snug">{item.titulo}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{item.resumo}</p>
            {item.conexao_b3 && (
              <div className="bg-muted/50 rounded-lg p-2.5 text-xs flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span><strong>Conexão B3:</strong> <span className="text-muted-foreground">{item.conexao_b3}</span></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}