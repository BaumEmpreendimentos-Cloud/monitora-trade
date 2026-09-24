import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

export default function QuotesCarousel({ cotacoes }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!autoScroll || !cotacoes?.length) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 160, behavior: 'smooth' });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [autoScroll, cotacoes]);

  const handleScroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  if (!cotacoes?.length) return null;

  return (
    <div className="w-full bg-card border-y">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold hidden sm:inline">Cotações</span>
          </div>
          <button onClick={() => setAutoScroll((p) => !p)} className="p-1 rounded hover:bg-accent text-muted-foreground" title={autoScroll ? 'Pausar' : 'Retomar'}>
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <button onClick={() => handleScroll('left')} className="p-1 rounded hover:bg-accent text-muted-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleScroll('right')} className="p-1 rounded hover:bg-accent text-muted-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
        <div
          ref={scrollRef}
          onMouseEnter={() => setAutoScroll(false)}
          onMouseLeave={() => setAutoScroll(true)}
          className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {cotacoes.map((q) => {
            const positive = q.change >= 0;
            return (
              <div key={q.symbol} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-background text-xs font-mono">
                <span className="font-bold">{q.symbol}</span>
                <span>R$ {Number(q.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`font-bold px-1 rounded ${positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  {positive ? '+' : ''}{Number(q.change).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}