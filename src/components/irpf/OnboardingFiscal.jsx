import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ResponsiveDialog from '@/components/ResponsiveDialog';

const CATEGORIAS = [
  { key: 'acoes', field: 'prejuizo_acumulado_acoes', dtField: 'prejuizo_dt_acoes', label: 'Ações' },
  { key: 'opcoes', field: 'prejuizo_acumulado_opcoes', dtField: 'prejuizo_dt_opcoes', label: 'Opções' },
  { key: 'fii', field: 'prejuizo_acumulado_fii', dtField: 'prejuizo_dt_fii', label: 'FIIs' },
  { key: 'futuros', field: 'prejuizo_acumulado_futuros', dtField: 'prejuizo_dt_futuros', label: 'Futuros' },
];

export default function OnboardingFiscal({ open, onClose, onSubmit, configExistente }) {
  const [mesInicio, setMesInicio] = useState('');
  const [temPrejuizo, setTemPrejuizo] = useState(false);
  const [temPrejuizoDT, setTemPrejuizoDT] = useState(false);
  const [prejuizos, setPrejuizos] = useState({});
  const [prejuizosDT, setPrejuizosDT] = useState({});
  const [impostosRecolhidos, setImpostosRecolhidos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (configExistente) {
      setMesInicio(configExistente.mes_inicio || '');
      setTemPrejuizo(CATEGORIAS.some((c) => Number(configExistente[c.field]) > 0));
      setTemPrejuizoDT(CATEGORIAS.some((c) => Number(configExistente[c.dtField]) > 0));
      const pj = {}; const pjdt = {};
      CATEGORIAS.forEach((c) => {
        pj[c.key] = configExistente[c.field] || '';
        pjdt[c.key] = configExistente[c.dtField] || '';
      });
      setPrejuizos(pj); setPrejuizosDT(pjdt);
      setImpostosRecolhidos(configExistente.impostos_anteriores_recolhidos || false);
    } else {
      setMesInicio(''); setTemPrejuizo(false); setTemPrejuizoDT(false);
      setPrejuizos({}); setPrejuizosDT({}); setImpostosRecolhidos(false);
    }
    setError('');
  }, [open, configExistente]);

  const handleSubmit = () => {
    setError('');
    if (!mesInicio) { setError('Selecione o mês inicial de apuração.'); return; }
    if (!impostosRecolhidos) { setError('É necessário confirmar que os impostos anteriores já foram recolhidos.'); return; }
    const dados = {
      mes_inicio: mesInicio,
      impostos_anteriores_recolhidos: impostosRecolhidos,
      onboarding_completo: true,
    };
    CATEGORIAS.forEach((c) => {
      dados[c.field] = temPrejuizo ? (Number(prejuizos[c.key]) || 0) : 0;
      dados[c.dtField] = temPrejuizoDT ? (Number(prejuizosDT[c.key]) || 0) : 0;
    });
    onSubmit(dados);
  };

  const footer = (
    <div className="flex gap-2 w-full">
      <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
      <Button className="flex-1" onClick={handleSubmit}>Salvar e iniciar apuração</Button>
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} title="Configuração Inicial — IR" footer={footer} className="max-w-lg">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium">1. Mês inicial de apuração</Label>
          <p className="text-xs text-muted-foreground">A partir de qual mês o sistema deve iniciar o cálculo encadeado do imposto.</p>
          <Input type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} />
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Checkbox checked={impostosRecolhidos} onCheckedChange={setImpostosRecolhidos} id="impostos" className="mt-0.5" />
            <div>
              <Label htmlFor="impostos" className="text-sm font-medium cursor-pointer">2. Impostos anteriores já recolhidos</Label>
              <p className="text-xs text-muted-foreground">Confirmo que os impostos sobre resultados de meses anteriores ao mês inicial já foram devidamente recolhidos.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox checked={temPrejuizo} onCheckedChange={setTemPrejuizo} id="prejuizo" className="mt-0.5" />
            <div>
              <Label htmlFor="prejuizo" className="text-sm font-medium cursor-pointer">3. Possuo prejuízos acumulados (swing trade)</Label>
              <p className="text-xs text-muted-foreground">Prejuízos não compensados de meses anteriores ao mês inicial.</p>
            </div>
          </div>
          {temPrejuizo && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              {CATEGORIAS.map((c) => (
                <div key={c.key} className="space-y-1">
                  <Label className="text-xs">{c.label}</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={prejuizos[c.key] || ''} onChange={(e) => setPrejuizos((p) => ({ ...p, [c.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox checked={temPrejuizoDT} onCheckedChange={setTemPrejuizoDT} id="prejuizoDT" className="mt-0.5" />
            <div>
              <Label htmlFor="prejuizoDT" className="text-sm font-medium cursor-pointer">4. Possuo prejuízos acumulados de day trade</Label>
              <p className="text-xs text-muted-foreground">Prejuízos de day trade só compensam lucros de day trade.</p>
            </div>
          </div>
          {temPrejuizoDT && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              {CATEGORIAS.map((c) => (
                <div key={c.key} className="space-y-1">
                  <Label className="text-xs">{c.label}</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={prejuizosDT[c.key] || ''} onChange={(e) => setPrejuizosDT((p) => ({ ...p, [c.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </ResponsiveDialog>
  );
}