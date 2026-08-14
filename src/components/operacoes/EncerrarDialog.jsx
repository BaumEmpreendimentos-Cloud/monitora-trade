import React, { useState, useEffect } from 'react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function EncerrarDialog({ operacao, onClose, onConfirm }) {
  const [preco, setPreco] = useState('');
  const [irrf, setIrrf] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (operacao) { setPreco(''); setIrrf(''); setErr(''); }
  }, [operacao]);

  const submit = () => {
    const p = Number(preco);
    if (!p || p <= 0) return setErr('Preço de encerramento inválido.');
    onConfirm(p, Number(irrf) || 0);
  };

  return (
    <ResponsiveDialog
      open={!!operacao}
      onOpenChange={(v) => !v && onClose()}
      title={`Encerrar ${operacao?.ativo}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="destructive" onClick={submit}>Encerrar</Button></>}
    >
      <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {operacao?.operacao} · {operacao?.quantidade} @ {operacao?.preco_entrada}
          </p>
          <div>
            <Label>Preço de Encerramento</Label>
            <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} autoFocus />
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