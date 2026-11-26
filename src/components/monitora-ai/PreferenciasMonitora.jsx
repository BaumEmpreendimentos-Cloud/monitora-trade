import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Loader2, Star, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import MobileSelect from '@/components/MobileSelect';
import { strategyTemplates } from '@/lib/strategyTemplates';
import { normalizarAtivo, MAX_ATIVOS } from '@/lib/monitora-ai/preferences';
import { META_COLLAR_PADRAO, normalizarMetaCollar } from '@/lib/collar';

export default function PreferenciasMonitora({ open, onOpenChange, ativos = [], estrategias = [], metaCollar = META_COLLAR_PADRAO, onSalvar, salvando }) {
  const [listaAtivos, setListaAtivos] = useState(ativos);
  const [listaEstrategias, setListaEstrategias] = useState(estrategias);
  const [meta, setMeta] = useState(normalizarMetaCollar(metaCollar));
  const [novoAtivo, setNovoAtivo] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!open) return;
    setListaAtivos(ativos);
    setListaEstrategias(estrategias);
    setMeta(normalizarMetaCollar(metaCollar));
    setNovoAtivo('');
    setErro('');
  }, [open, ativos, estrategias, metaCollar]);

  const categorias = useMemo(() => {
    const mapa = new Map();
    strategyTemplates.forEach((tpl) => {
      if (!mapa.has(tpl.category)) mapa.set(tpl.category, []);
      mapa.get(tpl.category).push(tpl);
    });
    return [...mapa.entries()];
  }, []);

  const adicionarAtivo = () => {
    const ticker = normalizarAtivo(novoAtivo);
    if (!ticker) return;
    if (!/^[A-Z0-9]{4,10}$/.test(ticker)) {
      setErro('Use o código do ativo, como PETR4 ou VALE3.');
      return;
    }
    if (listaAtivos.includes(ticker)) {
      setErro(`${ticker} já está na lista.`);
      return;
    }
    if (listaAtivos.length >= MAX_ATIVOS) {
      setErro(`Limite de ${MAX_ATIVOS} ativos monitorados.`);
      return;
    }
    setListaAtivos((prev) => [...prev, ticker]);
    setNovoAtivo('');
    setErro('');
  };

  const definirEstrategia = (id, ativa) => {
    setListaEstrategias((prev) => (
      ativa ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)
    ));
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ativos e estratégias preferidas"
      className="max-w-lg max-h-[85vh] overflow-y-auto"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            size="sm"
            disabled={salvando}
            onClick={() => onSalvar({ ativos: listaAtivos, estrategias: listaEstrategias, metaCollar: normalizarMetaCollar(meta) })}
          >
            {salvando && <Loader2 className="w-3 h-3 animate-spin" />} Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold">Ativos monitorados</h3>
            <span className="text-xs text-muted-foreground">{listaAtivos.length}/{MAX_ATIVOS}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            São os ativos disponíveis para varredura e acompanhamento de sinais.
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {listaAtivos.map((ticker) => (
              <span key={ticker} className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-muted text-xs">
                {ticker}
                <button
                  type="button"
                  onClick={() => setListaAtivos((prev) => prev.filter((t) => t !== ticker))}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label={`Remover ${ticker}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {!listaAtivos.length && <span className="text-xs text-muted-foreground">Nenhum ativo — a lista padrão será usada.</span>}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Input
              value={novoAtivo}
              onChange={(e) => { setNovoAtivo(e.target.value); setErro(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarAtivo(); } }}
              placeholder="Ex: BBDC4"
              className="h-8 max-w-[10rem] text-sm uppercase"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={adicionarAtivo} disabled={listaAtivos.length >= MAX_ATIVOS}>
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          </div>
          {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="font-heading text-sm font-semibold">Estratégias preferidas</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            As oportunidades dessas estratégias aparecem no topo da lista. Sem seleção, a ordem é apenas por data.
          </p>

          <div className="mt-2 space-y-3">
            {categorias.map(([categoria, templates]) => (
              <div key={categoria}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{categoria}</div>
                <ul className="space-y-1">
                  {templates.map((tpl) => (
                    <li key={tpl.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`estrategia-${tpl.id}`}
                        checked={listaEstrategias.includes(tpl.id)}
                        onCheckedChange={(marcado) => definirEstrategia(tpl.id, marcado === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor={`estrategia-${tpl.id}`} className="text-sm leading-snug cursor-pointer">
                        {tpl.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-heading text-sm font-semibold">Collar Tradicional — lucro mínimo na queda</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            A varredura só registra collars cujo piso de resultado (na queda até o strike da PUT) atinja esta meta.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              value={meta.valor}
              onChange={(e) => setMeta((m) => ({ ...m, valor: e.target.value }))}
              className="h-8 w-24 text-sm"
            />
            <div className="w-24">
              <MobileSelect
                value={meta.unidade}
                onValueChange={(v) => setMeta((m) => ({ ...m, unidade: v }))}
                options={[{ value: '%', label: '% do desembolso' }, { value: 'R$', label: 'R$ em reais' }]}
                placeholder="Unidade"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Preferências salvas apenas na sua conta.
        </p>
      </div>
    </ResponsiveDialog>
  );
}