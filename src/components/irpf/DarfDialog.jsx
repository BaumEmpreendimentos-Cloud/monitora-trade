import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { FileDown } from 'lucide-react';
import { mesLabel } from '@/lib/imposto';
import { jsPDF } from 'jspdf';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Último dia do mês de apuração (campo 02 da DARF)
const calcPeriodoApuracao = (mesChave) => {
  const [ano, mes] = mesChave.split('-').map(Number);
  return new Date(ano, mes, 0).toLocaleDateString('pt-BR');
};

// Último dia útil do mês seguinte (vencimento da DARF)
const calcVencimento = (mesChave) => {
  const [ano, mes] = mesChave.split('-').map(Number);
  let vAno = ano, vMes = mes + 1;
  if (vMes > 12) { vMes = 1; vAno = ano + 1; }
  const venc = new Date(vAno, vMes, 0);
  while (venc.getDay() === 0 || venc.getDay() === 6) venc.setDate(venc.getDate() - 1);
  return venc.toLocaleDateString('pt-BR');
};

// Desenha um bloco DARF no modelo oficial da Receita Federal
const drawDarfBlock = (doc, startY, data) => {
  const x = 10;
  const w = 190;
  let y = startY;

  doc.setLineWidth(0.5);

  // Cabeçalho
  doc.rect(x, y, w, 24);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('MINISTÉRIO DA FAZENDA', x + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria da Receita Federal', x + 2, y + 9);
  doc.text('Documento de Arrecadação de Receitas Federais', x + 2, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DARF', x + 2, y + 21);
  // Campo 02 no canto direito do cabeçalho
  doc.setLineWidth(0.3);
  doc.line(x + 130, y, x + 130, y + 24);
  doc.line(x + 130, y + 12, x + 200, y + 12);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('02 PERÍODO DE APURAÇÃO', x + 132, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.periodo, x + 132, y + 10);
  y += 24;

  // Campo 01: NOME / TELEFONE
  doc.rect(x, y, w, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('01 NOME / TELEFONE', x + 2, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.nome || '', x + 2, y + 8);
  y += 10;

  // Campos 03, 04, 05
  const w3 = 70, w4 = 60, w5 = 60;
  doc.rect(x, y, w3, 12);
  doc.rect(x + w3, y, w4, 12);
  doc.rect(x + w3 + w4, y, w5, 12);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('03 NÚMERO DO CPF / CNPJ', x + 2, y + 3);
  doc.text('04 CÓDIGO DA RECEITA', x + w3 + 2, y + 3);
  doc.text('05 NÚMERO DE REFERÊNCIA', x + w3 + w4 + 2, y + 3);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.cpf || '', x + 2, y + 9);
  doc.text('6015', x + w3 + 2, y + 9);
  y += 12;

  // Campos 06, 07, 08, 09
  const w6 = 48, w7 = 48, w8 = 47, w9 = 47;
  doc.rect(x, y, w6, 12);
  doc.rect(x + w6, y, w7, 12);
  doc.rect(x + w6 + w7, y, w8, 12);
  doc.rect(x + w6 + w7 + w8, y, w9, 12);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('06 DATA DE VENCIMENTO', x + 2, y + 3);
  doc.text('07 VALOR PRINCIPAL', x + w6 + 2, y + 3);
  doc.text('08 VALOR DA MULTA', x + w6 + w7 + 2, y + 3);
  doc.text('09 VALOR DOS JUROS E/OU', x + w6 + w7 + w8 + 2, y + 3);
  doc.text('ENCARGOS DL - 1.025/69', x + w6 + w7 + w8 + 2, y + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.vencimento, x + 2, y + 10);
  doc.text(data.valorPrincipal, x + w6 + 2, y + 10);
  doc.text('0,00', x + w6 + w7 + 2, y + 10);
  doc.text('0,00', x + w6 + w7 + w8 + 2, y + 10);
  y += 12;

  // Campo 10: VALOR TOTAL
  doc.rect(x, y, w, 12);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('10 VALOR TOTAL', x + 2, y + 3);
  doc.setFontSize(10);
  doc.text('R$ ' + data.valorTotal, x + 2, y + 10);
  y += 12;

  // Campo 11: AUTENTICAÇÃO BANCÁRIA
  doc.rect(x, y, w, 14);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('11 AUTENTICAÇÃO BANCÁRIA (Somente nas 1ª e 2ª vias)', x + 2, y + 3);
  y += 14;

  // Rodapé: ATENÇÃO
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ATENÇÃO', x + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text('NÃO RECEBER COM RASURAS', x + 18, y + 3);
  y += 6;

  return y;
};

export default function DarfDialog({ apuracao, userName, open, onClose, onConfirm }) {
  const [aceite, setAceite] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setAceite(false); setErr(''); }
  }, [open]);

  if (!apuracao) return null;

  const vencimento = calcVencimento(apuracao.mes);
  const periodo = calcPeriodoApuracao(apuracao.mes);

  const handleGerar = () => {
    if (!aceite) { setErr('É necessário concordar com o termo de responsabilidade para gerar a DARF.'); return; }

    const data = {
      nome: userName || '',
      cpf: '',
      periodo,
      vencimento,
      valorPrincipal: fmt(apuracao.impostoAPagar),
      valorTotal: fmt(apuracao.impostoAPagar),
    };

    const doc = new jsPDF();
    let y = drawDarfBlock(doc, 10, data);
    // Linha tracejada separando as duas vias
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, y + 3, 200, y + 3);
    doc.setLineDashPattern([], 0);
    drawDarfBlock(doc, y + 8, data);

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
          <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span className="font-medium">{vencimento}</span></div>
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