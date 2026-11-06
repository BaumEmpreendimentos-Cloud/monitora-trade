import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import HistoricoOperacaoRow from '@/components/operacoes/HistoricoOperacaoRow';
import HistoricoDividendoRow from '@/components/operacoes/HistoricoDividendoRow';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const columns = ['Ativo', 'Abertura', 'Cat.', 'Op.', 'Qtd', 'Preço Entr.', 'Preço Encerr.', 'Result. %', 'Result. Valor', 'Encerrado em', 'Ações'];

export default function HistoricoGrupoDesktop({ grupo, lista, divs, expanded, onToggle, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto hidden md:block">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
          <tr>{columns.map((column, i) => <th key={column} className={i < 4 ? 'text-left p-2' : i < 10 ? 'text-right p-2' : 'p-2'}>{column}</th>)}</tr>
        </thead>
        <tbody>
          <tr className="bg-primary/5 cursor-pointer hover:bg-primary/10" onClick={onToggle}>
            <td colSpan={11} className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-bold">{grupo.nome}</span>
                </div>
                <span>Resultado Total: <b className={grupo.total >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmt(grupo.total)}</b></span>
              </div>
            </td>
          </tr>
          {expanded && lista.map((operacao) => <HistoricoOperacaoRow key={operacao.id} operacao={operacao} onEdit={onEdit} onDelete={onDelete} />)}
          {expanded && divs.map((dividendo) => <HistoricoDividendoRow key={dividendo.id} dividendo={dividendo} />)}
        </tbody>
      </table>
    </div>
  );
}