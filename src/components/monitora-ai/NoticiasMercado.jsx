import React, { useState } from 'react';
import { Newspaper, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import CollapsibleCard from './CollapsibleCard';

const TOPICOS = [
  { id: 'geral', label: 'Panorama B3 e macro' },
  { id: 'juros', label: 'Juros e fiscal' },
  { id: 'dolar', label: 'Dólar e Fed' },
  { id: 'acoes', label: 'Blue chips' },
];

const fmtData = (iso) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

export default function NoticiasMercado() {
  const [topico, setTopico] = useState('geral');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function buscar(id = topico) {
    setTopico(id);
    setLoading(true);
    setErro('');
    try {
      const res = await base44.functions.invoke('noticiasMercado', { topico: id });
      if (res.data?.error) throw new Error(res.data.error);
      setDados(res.data);
    } catch (error) {
      setErro(error?.response?.data?.error || error?.message || 'Não foi possível buscar as notícias.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <CollapsibleCard
      id="noticias"
      icon={Newspaper}
      title="Notícias de mercado"
      subtitle="busca ao vivo na web"
      actions={
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => buscar(topico)} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {loading ? 'Buscando' : 'Buscar agora'}
        </Button>
      }
    >
      <div className="px-4 py-2 border-b">
        <div className="flex flex-wrap gap-1.5">
          {TOPICOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => buscar(t.id)}
              disabled={loading}
              className={`px-2 py-0.5 rounded border text-xs transition-colors ${topico === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Consulta ao vivo com contexto de busca. Resumo interpretativo das fontes citadas, não recomendação.
        </p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {erro && (
          <p className="text-xs text-red-700 rounded border border-red-200 bg-red-50 px-2 py-1.5">{erro}</p>
        )}

        {!dados && !erro && (
          <p className="text-sm text-muted-foreground">
            Escolha um tema ou clique em "Buscar agora" para consultar manchetes recentes com as fontes originais.
          </p>
        )}

        {dados && (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-line">{dados.briefing}</p>

            {!!dados.fontes?.length && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fontes citadas</p>
                {dados.fontes.map((f, i) => (
                  <div key={`${f.titulo}-${i}`} className="text-xs flex items-start gap-1 flex-wrap">
                    {f.url ? (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-start gap-1"
                      >
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{f.titulo}</span>
                      </a>
                    ) : (
                      <span>{f.titulo}</span>
                    )}
                    {f.veiculo && <span className="text-muted-foreground">· {f.veiculo}</span>}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">Consultado em {fmtData(dados.consultado_em)}.</p>
          </>
        )}
      </div>
    </CollapsibleCard>
  );
}