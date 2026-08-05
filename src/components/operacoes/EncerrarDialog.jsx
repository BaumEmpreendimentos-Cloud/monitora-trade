import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function EncerrarDialog({ operacao, onClose, onConfirm }) {
  const [preco, setPreco] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (operacao) { setPreco(''); setErr(''); }
  }, [operacao]);

  const submit = () => {
    const p = Number(preco);
    if (!p || p <= 0) return setErr('Preço de encerramento inválido.');
    onConfirm(p);
  };

  return (
    <Dialog open={!!operacao} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Encerrar {operacao?.ativo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {operacao?.operacao} · {operacao?.quantidade} @ {operacao?.preco_entrada}
          </p>
          <div>
            <Label>Preço de Encerramento</Label>
            <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} autoFocus />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={submit}>Encerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}