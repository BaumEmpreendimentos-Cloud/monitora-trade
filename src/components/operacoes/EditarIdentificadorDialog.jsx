import React, { useState, useEffect } from 'react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function EditarIdentificadorDialog({ grupo, onClose, onSubmit }) {
  const [nome, setNome] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (grupo) { setNome(grupo.nome || ''); setErr(''); }
  }, [grupo]);

  const submit = () => {
    const n = nome.trim();
    if (!n) return setErr('Informe o identificador.');
    onSubmit(n);
  };

  return (
    <ResponsiveDialog
      open={!!grupo}
      onOpenChange={(v) => !v && onClose()}
      title="Editar Identificador"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Salvar</Button></>}
    >
      <div className="space-y-3">
          <div>
            <Label>Identificador</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </ResponsiveDialog>
  );
}