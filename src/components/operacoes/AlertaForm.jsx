import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/MobileSelect';
import { Trash2 } from 'lucide-react';

export default function AlertaForm({ open, onClose, tipo, grupo, operacao }) {
  const [metrica, setMetrica] = useState('VALOR');
  const [condicao, setCondicao] = useState('ACIMA');
  const [valorAlvo, setValorAlvo] = useState('');
  const [err, setErr] = useState('');
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMetrica('VALOR'); setCondicao('ACIMA'); setValorAlvo(''); setErr('');
    (async () => {
      try {
        const filter = tipo === 'RESULTADO'
          ? { grupo_id: grupo?.id, status: 'ATIVO' }
          : { operacao_id: operacao?.id, status: 'ATIVO' };
        const list = await base44.entities.Alerta.filter(filter);
        setAlertas(list || []);
      } catch (e) { setAlertas([]); }
    })();
  }, [open]);

  const submit = async () => {
    setErr('');
    const v = parseFloat(valorAlvo);
    if (isNaN(v) || v <= 0) { setErr('Informe um valor válido.'); return; }
    setLoading(true);
    try {
      const data = { tipo, condicao, valor_alvo: v, status: 'ATIVO' };
      if (tipo === 'RESULTADO') {
        data.grupo_id = grupo.id;
        data.grupo_nome = grupo.nome;
        data.metrica = metrica;
      } else {
        data.operacao_id = operacao.id;
        data.ativo = operacao.ativo;
      }
      await base44.entities.Alerta.create(data);
      setValorAlvo('');
      const filter = tipo === 'RESULTADO'
        ? { grupo_id: grupo.id, status: 'ATIVO' }
        : { operacao_id: operacao.id, status: 'ATIVO' };
      const list = await base44.entities.Alerta.filter(filter);
      setAlertas(list || []);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Alerta.delete(id);
      setAlertas(p => p.filter(a => a.id !== id));
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  const title = tipo === 'RESULTADO'
    ? `Alertas de Resultado — ${grupo?.nome}`
    : `Alertas de Preço — ${operacao?.ativo}`;

  const fmtAlvo = (a) => {
    if (a.tipo === 'PRECO') return `R$ ${a.valor_alvo}`;
    return a.metrica === 'PERCENTUAL' ? `${a.valor_alvo}%` : `R$ ${a.valor_alvo}`;
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={title}
      footer={<><Button variant="outline" onClick={onClose}>Fechar</Button><Button onClick={submit} disabled={loading}>{loading ? 'Salvando...' : 'Adicionar'}</Button></>}
    >
      <div className="space-y-4">
        {alertas.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Alertas ativos</Label>
            {alertas.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{a.condicao === 'ACIMA' ? '≥' : '≤'} {fmtAlvo(a)}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 border-t pt-3">
          <Label className="text-xs text-muted-foreground">Criar novo alerta</Label>
          {tipo === 'RESULTADO' && (
            <div>
              <Label>Métrica</Label>
              <MobileSelect value={metrica} onValueChange={setMetrica} options={['VALOR', 'PERCENTUAL']} placeholder="Métrica" />
            </div>
          )}
          <div>
            <Label>Condição</Label>
            <MobileSelect value={condicao} onValueChange={setCondicao} options={['ACIMA', 'ABAIXO']} placeholder="Condição" />
          </div>
          <div>
            <Label>Valor Alvo {tipo === 'RESULTADO' ? (metrica === 'PERCENTUAL' ? '(%)' : '(R$)') : '(R$)'}</Label>
            <Input type="number" step="0.01" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="Ex: 1000.00" />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      </div>
    </ResponsiveDialog>
  );
}