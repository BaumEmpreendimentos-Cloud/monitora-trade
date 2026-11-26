import React, { useState, useEffect } from 'react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function EncerrarDialog({ operacao, onClose, onConfirm }) {
  const [preco, setPreco] = useState('');
  const [irrf, setIrrf] = useState('');
  const [qtd, setQtd] = useState('');
  const [err, setErr] = useState('');

  const total = Number(operacao?.quantidade) || 0;

  useEffect(() => {
    if (operacao) {
      setPreco(''); setIrrf(''); setErr('');
      setQtd(String(operacao.quantidade ?? ''));
    }
  }, [operacao]);

  const qtdNum = Number(qtd);
  const qtdValida = qtdNum > 0 && qtdNum <= total;
  const restante = total - (Number.isFinite(qtdNum) ? qtdNum : 0);
  const parcial = qtdValida && restante > 0;

  const submit = () => {
    const p = Number(preco);
    if (!p || p <= 0) return setErr('Preço de encerramento inválido.');
    if (!qtdNum || qtdNum <= 0) return setErr('Quantidade a encerrar inválida.');
    if (qtdNum > total) return setErr(`A quantidade máxima é ${total}.`);
    onConfirm(p, Number(irrf) || 0, qtdNum);
  };

  return (
    <ResponsiveDialog
      open={!!operacao}
      onOpenChange={(v) => !v && onClose()}
      title={`Encerrar ${operacao?.ativo}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="destructive" onClick={submit}>{parcial ? 'Encerrar parcial' : 'Encerrar'}</Button></>}
    >
      <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {operacao?.operacao} · {operacao?.quantidade} @ {operacao?.preco_entrada}
          </p>
          <div>
            <Label>Quantidade a Encerrar</Label>
            <div className="flex items-center gap-2">
              <Input type="number" step="1" min="1" max={total} value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus />
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setQtd(String(total))}>Tudo</Button>
            </div>
            {parcial ? (
              <p className="text-xs text-amber-600 mt-1">Fechamento parcial: restam {restante} em aberto nesta operação.</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">De {total} unidade(s). Informe menos que o total para fechar só uma parte.</p>
            )}
          </div>
          <div>
            <Label>Preço de Encerramento</Label>
            <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
          </div>
          <div>
            <Label>IRRF Retido (dedo-duro)</Label>
            <Input type="number" step="0.01" value={irrf} onChange={(e) => setIrrf(e.target.value)} placeholder="0,00" />
            <p className="text-xs text-muted-foreground mt-1">Valor retido na nota de corretagem (0,005% swing trade, 1% day trade).</p>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </ResponsiveDialog>
  );
}