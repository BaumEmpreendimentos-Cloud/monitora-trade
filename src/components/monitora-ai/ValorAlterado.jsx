import React from 'react';

/**
 * Mostra o valor atual de um indicador e, quando a última sincronização
 * detectou mudança, o valor anterior logo abaixo.
 */
export default function ValorAlterado({ valor, alteracao, formatar, className = '' }) {
  if (!alteracao) return <span className={className}>{formatar(valor)}</span>;
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className={className}>{formatar(valor)}</span>
      <span className="text-[10px] font-normal text-amber-600 whitespace-nowrap">
        antes {formatar(alteracao.de)}
      </span>
    </span>
  );
}