import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calcValorInicial, calcResultadoValor, calcResultadoPct } from '@/lib/operacoes';

const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR'];
const OPERACOES = ['COMPRA', 'VENDA'];
const isOption = (c) => c === 'CALL' || c === 'PUT';
const num = (v) => { const n = Number(v); return Number.isNaN(n) ? null : n; };

export default function EditarHistoricoDialog({ operacao, onClose, onSubmit }) {
  const [f, setF] = useState({});
  const [err, setErr] = useState('');

  useEffect(() => {
    if (operacao) {
      setF({
        ativo: operacao.ativo || '',
        ativo_base: operacao.ativo_base || '',
        categoria: operacao.categoria || 'ACAO',
        operacao: operacao.operacao || 'COMPRA',
        quantidade: operacao.quantidade ?? '',
        preco_entrada: operacao.preco_entrada ?? '',
        preco_fechamento: operacao.preco_fechamento ?? '',
        data_abertura: operacao.data_abertura ? operacao.data_abertura.slice(0, 10) : '',
        data_fechamento: operacao.data_fechamento ? operacao.data_fechamento.slice(0, 10) : '',
        strike: operacao.strike ?? '',
        vencimento: operacao.vencimento ? operacao.vencimento.slice(0, 10) : '',
      });
      setErr('');
    }
  }, [operacao]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const a = (f.ativo || '').trim().toUpperCase();
    if (!a) return setErr('Ativo obrigatório.');
    if (!CATEGORIAS.includes(f.categoria)) return setErr('Categoria inválida.');
    if (!OPERACOES.includes(f.operacao)) return setErr('Operação inválida.');
    const q = num(f.quantidade);
    const pe = num(f.preco_entrada);
    const pf = num(f.preco_fechamento);
    if (q == null || q <= 0) return setErr('Quantidade inválida.');
    if (pe == null || pe <= 0) return setErr('Preço de entrada inválido.');
    if (pf == null) return setErr('Preço de fechamento inválido.');

    const opt = isOption(f.categoria);
    let strikeVal = null, vencVal = null, baseVal = null;
    if (opt) {
      strikeVal = num(f.strike);
      if (strikeVal == null || strikeVal <= 0) return setErr('Strike inválido para opção.');
      if (!f.vencimento) return setErr('Vencimento obrigatório para opção.');
      vencVal = f.vencimento;
      baseVal = (f.ativo_base || '').trim().toUpperCase();
      if (!baseVal) return setErr('Ativo base obrigatório para opção.');
    }

    onSubmit(operacao.id, {
      ativo: a,
      ativo_base: baseVal,
      categoria: f.categoria,
      operacao: f.operacao,
      quantidade: q,
      preco_entrada: pe,
      valor_inicial: calcValorInicial(f.operacao, q, pe),
      data_abertura: f.data_abertura || null,
      strike: strikeVal,
      vencimento: vencVal,
      preco_fechamento: pf,
      resultado_valor: calcResultadoValor(f.operacao, q, pe, pf),
      resultado_pct: calcResultadoPct(f.operacao, pe, pf),
      data_fechamento: f.data_fechamento ? `${f.data_fechamento}T12:00:00` : (operacao.data_fechamento || new Date().toISOString()),
    });
  };

  return (
    <Dialog open={!!operacao} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar Operação {operacao?.ativo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ativo</Label>
              <Input className="uppercase" maxLength={8} value={f.ativo || ''} onChange={(e) => set('ativo', e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={f.categoria} onValueChange={(v) => set('categoria', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {isOption(f.categoria) && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Ativo base</Label>
                <Input className="uppercase" maxLength={8} value={f.ativo_base || ''} onChange={(e) => set('ativo_base', e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label>Strike</Label>
                <Input type="number" step="0.01" value={f.strike ?? ''} onChange={(e) => set('strike', e.target.value)} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={f.vencimento || ''} onChange={(e) => set('vencimento', e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Operação</Label>
              <Select value={f.operacao} onValueChange={(v) => set('operacao', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OPERACOES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={f.quantidade ?? ''} onChange={(e) => set('quantidade', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço de Entrada</Label>
              <Input type="number" step="0.01" value={f.preco_entrada ?? ''} onChange={(e) => set('preco_entrada', e.target.value)} />
            </div>
            <div>
              <Label>Preço de Fechamento</Label>
              <Input type="number" step="0.01" value={f.preco_fechamento ?? ''} onChange={(e) => set('preco_fechamento', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Abertura</Label>
              <Input type="date" value={f.data_abertura || ''} onChange={(e) => set('data_abertura', e.target.value)} />
            </div>
            <div>
              <Label>Data Fechamento</Label>
              <Input type="date" value={f.data_fechamento || ''} onChange={(e) => set('data_fechamento', e.target.value)} />
            </div>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}