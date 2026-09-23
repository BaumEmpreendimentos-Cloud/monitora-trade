import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { calcValorInicial } from '@/lib/operacoes';
import { Save, FlaskConical, Building2 } from 'lucide-react';

export default function SalvarOperacaoDialog({ open, onOpenChange, legs, ativoBase, defaultName, onSaved }) {
  const [simulada, setSimulada] = useState(true);
  const [identificador, setIdentificador] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSimulada(true);
      setIdentificador(defaultName ? `${defaultName.split('(')[0].trim().slice(0, 20)}` : '');
      setError('');
    }
  }, [open, defaultName]);

  const handleSave = async () => {
    if (!identificador.trim()) {
      setError('Informe um identificador para a operação.');
      return;
    }
    if (!legs || legs.length === 0) {
      setError('Nenhuma perna no simulador.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let grupo = null;
      const existing = await base44.entities.GrupoOperacao.filter({ nome: identificador.trim() });
      if (existing && existing.length > 0) {
        grupo = existing[0];
      } else {
        grupo = await base44.entities.GrupoOperacao.create({ nome: identificador.trim() });
      }

      const today = new Date().toISOString().split('T')[0];
      const operacoesData = legs.map((leg) => {
        const isStock = leg.type === 'STOCK';
        const categoria = isStock ? 'ACAO' : leg.type;
        const operacao = leg.side === 'BUY' ? 'COMPRA' : 'VENDA';
        const valorInicial = calcValorInicial(operacao, leg.quantity, leg.premium);
        return {
          grupo_id: grupo.id,
          grupo_nome: grupo.nome,
          ativo: (leg.ticker || ativoBase || '').toUpperCase(),
          ativo_base: isStock ? (leg.ticker || ativoBase || '').toUpperCase() : (ativoBase || '').toUpperCase(),
          categoria,
          operacao,
          quantidade: leg.quantity || 100,
          preco_entrada: leg.premium || 0,
          valor_inicial: valorInicial,
          data_abertura: today,
          strike: isStock ? null : (leg.strike || null),
          vencimento: isStock ? null : (leg.dueDate || null),
          status: 'ABERTA',
          simulada,
        };
      });

      await base44.entities.Operacao.bulkCreate(operacoesData);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erro ao salvar operação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Salvar Estratégia como Operação"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Tipo de Operação</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSimulada(true)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition ${
                simulada
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <FlaskConical className={`w-5 h-5 ${simulada ? 'text-purple-600' : 'text-muted-foreground'}`} />
              <span className="text-xs font-bold">Simulada</span>
              <span className="text-[10px] text-muted-foreground text-center">Acompanhamento</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulada(false)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition ${
                !simulada
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <Building2 className={`w-5 h-5 ${!simulada ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <span className="text-xs font-bold">Real</span>
              <span className="text-[10px] text-muted-foreground text-center">Montada na corretora</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="identificador">Identificador da Operação</Label>
          <Input
            id="identificador"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Ex: Covered Call PETR4, Iron Condor VALE3..."
            maxLength={50}
          />
          <p className="text-[11px] text-muted-foreground">
            Este nome agrupa todas as pernas da estratégia na aba de Operações.
          </p>
        </div>

        <div className="p-3 rounded-lg border bg-muted/50 space-y-1 text-xs">
          <div className="font-semibold text-muted-foreground uppercase mb-1">Resumo da Estratégia</div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pernas:</span><span className="font-mono font-bold">{legs?.length || 0}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ativo Base:</span><span className="font-mono font-bold">{ativoBase || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span className={`font-bold ${simulada ? 'text-purple-600' : 'text-emerald-600'}`}>{simulada ? 'Simulada' : 'Real'}</span></div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}