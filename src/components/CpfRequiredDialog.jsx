import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';

const maskCpf = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export default function CpfRequiredDialog({ user, onSaved }) {
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.');
      return;
    }
    setLoading(true);
    try {
      // CPF + trial_start are set server-side to prevent client-side bypass
      await base44.functions.invoke('salvarCpf', { cpf: digits });
      await onSaved();
    } catch (e) {
      setError('Erro ao salvar CPF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-5 bg-card rounded-xl border p-6 shadow-lg">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <User className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-bold">CPF obrigatório</h2>
          <p className="text-sm text-muted-foreground">
            Para continuar, é necessário informar seu CPF. Ele será utilizado na geração da DARF do Imposto de Renda e para validação do período de teste.
          </p>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            maxLength={14}
            inputMode="numeric"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button className="w-full min-h-[44px]" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}