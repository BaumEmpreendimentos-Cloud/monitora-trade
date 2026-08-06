import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle } from 'lucide-react';

const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR', 'DIV'];
const OPERACOES = ['COMPRA', 'VENDA'];

const inputCls = 'w-full px-1.5 py-1 text-xs rounded border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring';

export default function ImportarPreviewTable({ rows, onChange, onRemove, onConfirm, onCancel, saving }) {
  const validCount = rows.filter((r) => !r._error).length;
  const errorCount = rows.length - validCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} linha(s) — <b className="text-emerald-600">{validCount} válida(s)</b>
          {errorCount > 0 && <b className="text-destructive"> · {errorCount} com erro</b>}
        </p>
        <p className="text-xs text-muted-foreground">Edite as células diretamente na tabela antes de confirmar.</p>
      </div>

      <div className="overflow-auto rounded-md border max-h-[55vh]">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-muted/50 text-muted-foreground uppercase sticky top-0 z-10">
            <tr>
              <th className="text-left p-2 font-medium">Identificador</th>
              <th className="text-left p-2 font-medium">Ativo</th>
              <th className="text-left p-2 font-medium">Base</th>
              <th className="text-left p-2 font-medium">Cat.</th>
              <th className="text-left p-2 font-medium">Op.</th>
              <th className="text-right p-2 font-medium">Qtd</th>
              <th className="text-right p-2 font-medium">Preço Entr.</th>
              <th className="text-right p-2 font-medium">Preço Encerr.</th>
              <th className="text-left p-2 font-medium">Abertura</th>
              <th className="text-left p-2 font-medium">Fechamento</th>
              <th className="text-right p-2 font-medium">Strike</th>
              <th className="text-left p-2 font-medium">Vencimento</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t ${r._error ? 'bg-red-50' : ''}`}>
                <td className="p-1"><input className={inputCls} value={r.identificador} onChange={(e) => onChange(i, 'identificador', e.target.value)} /></td>
                <td className="p-1"><input className={`${inputCls} uppercase`} value={r.ativo} onChange={(e) => onChange(i, 'ativo', e.target.value.toUpperCase())} /></td>
                <td className="p-1"><input className={`${inputCls} uppercase`} value={r.ativo_base || ''} onChange={(e) => onChange(i, 'ativo_base', e.target.value.toUpperCase())} /></td>
                <td className="p-1">
                  <select className={inputCls} value={r.categoria} onChange={(e) => onChange(i, 'categoria', e.target.value)}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="p-1">
                  <select className={inputCls} value={r.operacao} onChange={(e) => onChange(i, 'operacao', e.target.value)}>
                    {OPERACOES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="p-1"><input className={`${inputCls} text-right`} value={r.quantidade} onChange={(e) => onChange(i, 'quantidade', e.target.value)} /></td>
                <td className="p-1"><input className={`${inputCls} text-right`} value={r.preco_entrada} onChange={(e) => onChange(i, 'preco_entrada', e.target.value)} /></td>
                <td className="p-1"><input className={`${inputCls} text-right`} value={r.preco_fechamento} onChange={(e) => onChange(i, 'preco_fechamento', e.target.value)} /></td>
                <td className="p-1"><input type="date" className={inputCls} value={r.data_abertura || ''} onChange={(e) => onChange(i, 'data_abertura', e.target.value)} /></td>
                <td className="p-1"><input type="date" className={inputCls} value={r.data_fechamento || ''} onChange={(e) => onChange(i, 'data_fechamento', e.target.value)} /></td>
                <td className="p-1"><input className={`${inputCls} text-right`} value={r.strike || ''} onChange={(e) => onChange(i, 'strike', e.target.value)} /></td>
                <td className="p-1"><input type="date" className={inputCls} value={r.vencimento || ''} onChange={(e) => onChange(i, 'vencimento', e.target.value)} /></td>
                <td className="p-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onRemove(i)} title="Remover linha">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errorCount > 0 && (
        <div className="space-y-1 text-xs text-destructive">
          {rows.map((r, i) => r._error ? (
            <div key={i} className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> Linha {i + 1}: {r._error}</div>
          ) : null)}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button onClick={onConfirm} disabled={saving || validCount === 0}>
          {saving ? 'Salvando...' : `Confirmar Importação (${validCount})`}
        </Button>
      </div>
    </div>
  );
}