import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { AlertTriangle, FileDown } from 'lucide-react';
import { mesLabel } from '@/lib/imposto';
import { jsPDF } from 'jspdf';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Último dia útil do mês seguinte à apuração (vencimento da DARF)
const calcVencimento = (mesChave) => {
  const [ano, mes] = mesChave.split('-').map(Number);
  let vAno = ano, vMes = mes + 1;
  if (vMes > 12) { vMes = 1; vAno = ano + 1; }
  const venc = new Date(vAno, vMes, 0);
  while (venc.getDay() === 0 || venc.getDay() === 6) venc.setDate(venc.getDate() - 1);
  return venc;
};

export default function DarfDialog({ apuracao, userName, open, onClose, onConfirm }) {
  const [aceite, setAceite] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setAceite(false); setErr(''); }
  }, [open]);

  if (!apuracao) return null;

  const vencimento = calcVencimento(apuracao.mes);
  const vencStr = vencimento.toLocaleDateString('pt-BR');

  const handleGerar = () => {
    if (!aceite) { setErr('É necessário concordar com o termo de responsabilidade para gerar a DARF.'); return; }

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Documento Auxiliar — DARF', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Codigo da Receita: 6015 — IRPF / Renda Variavel`, 14, y); y += 7;
    doc.text(`Contribuinte: ${userName || '—'}`, 14, y); y += 7;
    doc.text(`Periodo de Apuracao: ${mesLabel(apuracao.mes)}`, 14, y); y += 7;
    doc.text(`Categoria: ${apuracao.categoriaLabel} — ${apuracao.tipo}`, 14, y); y += 7;
    doc.text(`Data de Vencimento: ${vencStr}`, 14, y); y += 10;

    doc.line(14, y, 196, y); y += 8;
    doc.text(`Resultado Bruto: R$ ${fmt(apuracao.resultadoBruto)}`, 14, y); y += 7;
    doc.text(`Prejuizo Compensado: R$ ${fmt(apuracao.prejuizoCompensado)}`, 14, y); y += 7;
    const base = apuracao.resultadoBruto - apuracao.prejuizoCompensado;
    doc.text(`Base de Calculo: R$ ${fmt(base)}`, 14, y); y += 7;
    doc.text(`Aliquota: ${(apuracao.aliquota * 100).toFixed(0)}%`, 14, y); y += 7;
    doc.text(`Imposto Devido: R$ ${fmt(apuracao.impostoDevido)}`, 14, y); y += 7;
    doc.text(`IRRF a Deduzir: R$ ${fmt(apuracao.irrf)}`, 14, y); y += 7;
    doc.setFont(undefined, 'bold');
    doc.text(`Valor a Pagar: R$ ${fmt(apuracao.impostoAPagar)}`, 14, y); y += 10;
    doc.setFont(undefined, 'normal');

    doc.line(14, y, 196, y); y += 10;
    doc.setFontSize(8);
    const disclaimer = 'Este documento e uma estimativa gerada pelo Monitora Trade com base nos dados registrados pelo usuario. A responsabilidade pela conferencia, exatidao e recolhimento dos impostos e exclusivamente do contribuinte. O pagamento deve ser efetuado atraves do sistema SicalcWeb da Receita Federal ou via PIX. Consulte um contador para validacao.';
    doc.text(disclaimer, 14, y, { maxWidth: 182 });

    doc.save(`DARF_${apuracao.mes}_${apuracao.categoria}_${apuracao.tipoKey}.pdf`);
    onConfirm(apuracao);
  };

  const footer = (
    <div className="flex gap-2 w-full">
      <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
      <Button className="flex-1" onClick={handleGerar} disabled={!aceite}><FileDown className="w-4 h-4 mr-1" /> Gerar DARF</Button>
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()} title="Geração de DARF" footer={footer} className="max-w-lg">
      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Período</span><span className="font-medium">{mesLabel(apuracao.mes)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Categoria</span><span className="font-medium">{apuracao.categoriaLabel} — {apuracao.tipo}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Código da Receita</span><span className="font-medium">6015</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span className="font-medium">{vencStr}</span></div>
          <div className="border-t pt-2 flex justify-between"><span className="text-muted-foreground">Imposto Devido</span><span>R$ {fmt(apuracao.impostoDevido)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">IRRF</span><span>R$ {fmt(apuracao.irrf)}</span></div>
          <div className="flex justify-between font-bold"><span>Valor a Pagar</span><span className="text-red-600">R$ {fmt(apuracao.impostoAPagar)}</span></div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
          <div className="flex items-start gap-2">
            <Checkbox checked={aceite} onCheckedChange={setAceite} id="aceite-darf" className="mt-0.5" />
            <Label htmlFor="aceite-darf" className="text-xs cursor-pointer leading-relaxed">
              <b>Termo de Responsabilidade:</b> Declaro estar ciente de que a responsabilidade pela conferência e exatidão das informações prestadas é exclusivamente minha, e que a plataforma Monitora Trade se exime de qualquer responsabilidade em caso de erro no cálculo ou nas informações apresentadas.
            </Label>
          </div>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </ResponsiveDialog>
  );
}