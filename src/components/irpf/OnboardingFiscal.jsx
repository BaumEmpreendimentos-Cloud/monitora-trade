import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ResponsiveDialog from '@/components/ResponsiveDialog';

export default function OnboardingFiscal({ open, onClose, onSubmit, configExistente }) {
  const [mesInicio, setMesInicio] = useState('');
  const [temPrejuizo, setTemPrejuizo] = useState(false);
  const [prejuizoSwing, setPrejuizoSwing] = useState('');
  const [prejuizoDt, setPrejuizoDt] = useState('');
  const [impostosRecolhidos, setImpostosRecolhidos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (configExistente) {
      setMesInicio(configExistente.mes_inicio || '');
      // Backward compat: soma campos antigos se os novos não estiverem definidos
      const swing = Number(configExistente.prejuizo_swing || 0) ||
        (Math.abs(Number(configExistente.prejuizo_acumulado_acoes || 0)) +
         Math.abs(Number(configExistente.prejuizo_acumulado_opcoes || 0)) +
         Math.abs(Number(configExistente.prejuizo_acumulado_fii || 0)) +
         Math.abs(Number(configExistente.prejuizo_acumulado_futuros || 0)));
      const dt = Number(configExistente.prejuizo_dt || 0) ||
        (Math.abs(Number(configExistente.prejuizo_dt_acoes || 0)) +
         Math.abs(Number(configExistente.prejuizo_dt_opcoes || 0)) +
         Math.abs(Number(configExistente.prejuizo_dt_fii || 0)) +
         Math.abs(Number(configExistente.prejuizo_dt_futuros || 0)));
      setTemPrejuizo(swing > 0 || dt > 0);
      setPrejuizoSwing(swing > 0 ? String(swing) : '');
      setPrejuizoDt(dt > 0 ? String(dt) : '');
      setImpostosRecolhidos(configExistente.impostos_anteriores_recolhidos || false);
    } else {
      setMesInicio(''); setTemPrejuizo(false);
      setPrejuizoSwing(''); setPrejuizoDt('');
      setImpostosRecolhidos(false);
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
      prejuizo_swing: temPrejuizo ? (Number(prejuizoSwing) || 0) : 0,
      prejuizo_dt: temPrejuizo ? (Number(prejuizoDt) || 0) : 0,
      // Zera campos antigos para evitar dupla contagem
      prejuizo_acumulado_acoes: 0,
      prejuizo_acumulado_opcoes: 0,
      prejuizo_acumulado_fii: 0,
      prejuizo_acumulado_futuros: 0,
      prejuizo_dt_acoes: 0,
      prejuizo_dt_opcoes: 0,
      prejuizo_dt_fii: 0,
      prejuizo_dt_futuros: 0,
    };
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
              <Label htmlFor="prejuizo" className="text-sm font-medium cursor-pointer">3. Possuo prejuízos acumulados</Label>
              <p className="text-xs text-muted-foreground">Prejuízos não compensados de meses anteriores ao mês inicial. O prejuízo de swing trade e day trade são tratados em pools separados.</p>
            </div>
          </div>
          {temPrejuizo && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div className="space-y-1">
                <Label className="text-xs">Swing Trade</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={prejuizoSwing} onChange={(e) => setPrejuizoSwing(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Day Trade</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={prejuizoDt} onChange={(e) => setPrejuizoDt(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </ResponsiveDialog>
  );
}