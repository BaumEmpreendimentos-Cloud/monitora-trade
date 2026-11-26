import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Cartão padrão da Monitora AI com recolhimento individual.
 * O estado fica salvo no navegador do usuário por painel.
 */
export default function CollapsibleCard({
  id,
  icon: Icon,
  title,
  subtitle,
  actions,
  footer,
  defaultOpen = true,
  className,
  children,
}) {
  const storageKey = `monitora-ai-panel:${id}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === null ? defaultOpen : saved === '1';
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* storage indisponível: mantém apenas em memória */
      }
      return next;
    });
  };

  return (
    <section className={cn('rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-2 min-w-0 text-left"
        >
          <ChevronDown
            className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', !open && '-rotate-90')}
          />
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <h2 className="font-heading text-sm font-semibold truncate">{title}</h2>
          {subtitle && (
            <span className="hidden md:inline text-xs uppercase tracking-wide text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </button>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>

      {open && <div className="border-t">{children}</div>}
      {open && footer}
    </section>
  );
}