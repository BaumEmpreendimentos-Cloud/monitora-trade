import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { calcValorInicial } from '@/lib/operacoes';
import { parseLegs } from '@/lib/monitora-ai/lucratividade';
import { PlayCircle } from 'lucide-react';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');

const nomePadrao = (op) => `${op.ativo_base || ''} ${op.estrategia_nome || ''}`.trim().slice(0, 50);

export default function ExecutarOportunidadeDialog({ open, onOpenChange, op, onSaved }) {
  const [identificador, setIdentificador] = useState('');
  const [legs, setLegs] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !op) return;
    setIdentificador(nomePadrao(op));
    setLegs(
      parseLegs(op).map((l) => ({
        ...l,
        quantity: Number(l.quantity) || 100,
        premium: Number(l.premium) || 0,
      }))
    );
    setError('');
  }, [open, op]);

  const atualizarPerna = (index, campo, valor) => {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, [campo]: valor } : l)));
  };

  const fluxoInicial = useMemo(
    () => legs.reduce((acc, l) => acc + calcValorInicial(l.side === 'BUY' ? 'COMPRA' : 'VENDA', Number(l.quantity) || 0, Number(l.premium) || 0), 0),
    [legs]
  );

  async function handleSalvar() {
    const nome = identificador.trim();
    if (!nome) {
      setError('Informe um identificador para a operação.');
      return;
    }
    if (!legs.length) {
      setError('A estrutura não tem pernas resolvidas.');
      return;
    }
    if (legs.some((l) => !(Number(l.quantity) > 0))) {
      setError('A quantidade de cada perna deve ser maior que zero.');
      return;
    }

    setSalvando(true);
    setError('');
    try {
      const existentes = await base44.entities.GrupoOperacao.filter({ nome });
      const grupo = existentes?.length ? existentes[0] : await base44.entities.GrupoOperacao.create({ nome });

      const hoje = new Date().toISOString().split('T')[0];
      const registros = legs.map((l) => {
        const isStock = l.type === 'STOCK';
        const operacao = l.side === 'BUY' ? 'COMPRA' : 'VENDA';
        const quantidade = Number(l.quantity) || 100;
        const preco = Number(l.premium) || 0;
        return {
          grupo_id: grupo.id,
          grupo_nome: grupo.nome,
          ativo: (l.ticker || op.ativo_base || '').toUpperCase(),
          ativo_base: (op.ativo_base || '').toUpperCase(),
          categoria: isStock ? 'ACAO' : l.type,
          operacao,
          quantidade,
          preco_entrada: preco,
          valor_inicial: calcValorInicial(operacao, quantidade, preco),
          data_abertura: hoje,
          strike: isStock ? null : (l.strike || null),
          vencimento: isStock ? null : (l.dueDate || null),
          status: 'ABERTA',
          origem: 'MONITORA_AI',
        };
      });

      await base44.entities.Operacao.bulkCreate(registros);
      await base44.entities.AiOportunidade.update(op.id, {
        status: 'EXECUTADA',
        grupo_operacao_id: grupo.id,
      });

      onOpenChange(false);
      if (onSaved) onSaved(grupo);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erro ao executar a operação.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Executar oportunidade"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSalvar} disabled={salvando}>
            <PlayCircle className="w-4 h-4 mr-1" /> {salvando ? 'Salvando...' : 'Executar e salvar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="identificador-execucao">Identificador da operação</Label>
          <Input
            id="identificador-execucao"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Ex: Covered Call PETR4"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            Agrupa as pernas em Operações e no quadro "Operações via Monitora AI".
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Pernas da estrutura</Label>
          {legs.map((l, i) => (
            <div key={`${l.ticker}-${i}`} className="rounded-lg border p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">
                  {l.side === 'BUY' ? 'Compra' : 'Venda'} {l.type}
                  {l.strike ? ` · strike ${brl(l.strike)}` : ''}
                </span>
                <span className="text-muted-foreground shrink-0">{l.dueDate || 'À vista'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ativo</Label>
                  <Input
                    value={l.ticker || ''}
                    onChange={(e) => atualizarPerna(i, 'ticker', e.target.value.toUpperCase())}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd.</Label>
                  <Input
                    type="number"
                    min="1"
                    value={l.quantity}
                    onChange={(e) => atualizarPerna(i, 'quantity', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Preço</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.premium}
                    onChange={(e) => atualizarPerna(i, 'premium', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pernas</span>
            <span className="font-semibold tabular-nums">{legs.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fluxo inicial (débito/crédito)</span>
            <span className="font-semibold tabular-nums">{brl(fluxoInicial)}</span>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}