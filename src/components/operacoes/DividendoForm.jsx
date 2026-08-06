import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export default function DividendoForm({ open, onClose, grupo, ativosBase, onSubmit }) {
  const [ativo, setAtivo] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorPorAcao, setValorPorAcao] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAtivo(ativosBase?.[0] || '');
      setDataPagamento('');
      setQuantidade('');
      setValorPorAcao('');
      setError('');
    }
  }, [open, ativosBase]);

  const handleSubmit = () => {
    if (!ativo) { setError('Selecione o ativo.'); return; }
    if (!dataPagamento) { setError('Informe a data de pagamento.'); return; }
    const qtd = Number(quantidade);
    const vpa = Number(valorPorAcao);
    if (!qtd || qtd <= 0) { setError('Quantidade inválida.'); return; }
    if (!vpa || vpa <= 0) { setError('Valor do dividendo inválido.'); return; }
    onSubmit({
      ativo,
      dataPagamento,
      quantidade: qtd,
      valorPorAcao: vpa,
      valorTotal: qtd * vpa,
    });
  };

  const multi = ativosBase && ativosBase.length > 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dividendos — {grupo?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ativo base</Label>
            {multi ? (
              <Select value={ativo} onValueChange={setAtivo}>
                <SelectTrigger><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
                <SelectContent>
                  {ativosBase.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={ativo || '—'} readOnly />
            )}
          </div>
          <div>
            <Label>Data de Pagamento</Label>
            <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          </div>
          <div>
            <Label>Quantidade de Ações</Label>
            <Input type="number" min="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          <div>
            <Label>Valor do Dividendo (por ação)</Label>
            <Input type="number" min="0" step="0.01" value={valorPorAcao} onChange={(e) => setValorPorAcao(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}