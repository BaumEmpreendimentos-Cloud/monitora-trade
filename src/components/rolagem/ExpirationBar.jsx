import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function ExpirationBar({ expiracoes, expLeft, expRight, onSelect }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  if (!expiracoes.length) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border hover:bg-accent"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scroll-container flex-1 pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {expiracoes.map((exp) => {
          const isLeft = exp.date === expLeft;
          const isRight = exp.date === expRight;
          const active = isLeft || isRight;

          return (
            <button
              key={exp.date}
              type="button"
              onClick={() => onSelect(exp.date)}
              className={`shrink-0 w-[5.5rem] rounded-md border overflow-hidden text-center transition-all ${
                active ? 'border-transparent shadow-sm' : 'border-border hover:border-primary/40'
              }`}
            >
              <div
                className={`text-xs font-bold py-0.5 uppercase tracking-wide ${
                  isLeft
                    ? 'bg-primary text-primary-foreground'
                    : isRight
                    ? 'bg-teal-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isLeft ? 'Venc 1' : isRight ? 'Venc 2' : exp.days != null ? `${exp.days}d` : '—'}
              </div>
              <div className={`py-1 text-xs font-medium ${active ? 'bg-card' : 'bg-card/50'}`}>
                {fmtDate(exp.date)}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border hover:bg-accent"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}