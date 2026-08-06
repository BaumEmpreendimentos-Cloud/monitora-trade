import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { calcValorInicial, calcResultadoValor, calcResultadoPct } from '@/lib/operacoes';
import ImportarPreviewTable from '@/components/operacoes/ImportarPreviewTable';

const TEMPLATE_ROWS = [
  ['identificador', 'ativo', 'ativo_base', 'categoria', 'operacao', 'quantidade', 'preco_entrada', 'data_abertura', 'strike', 'vencimento', 'preco_fechamento', 'resultado_valor', 'resultado_pct', 'data_fechamento'],
  ['Exemplo', 'PETR4', '', 'ACAO', 'COMPRA', '100', '28,50', '2026-01-15', '', '', '28,80', '30,00', '1,07', '2026-01-20'],
  ['Exemplo', 'PETR4', '', 'ACAO', 'COMPRA', '200', '28,50', '2026-01-15', '', '', '27,00', '-30,00', '-5,26', '2026-01-18'],
];

const SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          identificador: { type: 'string' },
          ativo: { type: 'string' },
          ativo_base: { type: 'string' },
          categoria: { type: 'string', enum: ['ACAO', 'CALL', 'PUT', 'DOLLAR'] },
          operacao: { type: 'string', enum: ['COMPRA', 'VENDA'] },
          quantidade: { type: 'number' },
          preco_entrada: { type: 'number' },
          data_abertura: { type: 'string' },
          strike: { type: 'number' },
          vencimento: { type: 'string' },
          preco_fechamento: { type: 'number' },
          resultado_valor: { type: 'number' },
          resultado_pct: { type: 'number' },
          data_fechamento: { type: 'string' },
        },
        required: ['identificador', 'ativo', 'categoria', 'operacao', 'quantidade', 'preco_entrada', 'preco_fechamento'],
      },
    },
  },
};

const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR'];
const OPERACOES = ['COMPRA', 'VENDA'];

const num = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(String(v).replace(/\./g, '').replace(',', '.')) : Number(v);
  return Number.isNaN(n) ? null : n;
};
const toDate = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}T12:00:00`; }
  return s;
};

const validateRow = (r) => {
  if (!r.identificador || !String(r.identificador).trim()) return 'Identificador obrigatório';
  if (!r.ativo || !String(r.ativo).trim()) return 'Ativo obrigatório';
  if (!CATEGORIAS.includes(r.categoria)) return 'Categoria inválida';
  if (!OPERACOES.includes(r.operacao)) return 'Operação inválida';
  if (num(r.quantidade) == null || num(r.quantidade) <= 0) return 'Quantidade inválida';
  if (num(r.preco_entrada) == null || num(r.preco_entrada) <= 0) return 'Preço de entrada inválido';
  if (num(r.preco_fechamento) == null) return 'Preço de fechamento inválido';
  return null;
};

export default function ImportarHistorico() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    const csv = TEMPLATE_ROWS.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_historico_operacoes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (!file) return;
    setProcessing(true); setError(''); setResult(null); setPreview(null);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: up.file_url, json_schema: SCHEMA });
      const rows = (res.output && res.output.rows) || (Array.isArray(res.output) ? res.output : []);
      if (!rows.length) { setError('Nenhuma operação encontrada no arquivo.'); setProcessing(false); return; }

      const parsed = rows.map((r) => {
        const row = {
          identificador: r.identificador || '',
          ativo: (r.ativo || '').toUpperCase(),
          ativo_base: (r.ativo_base || '').toUpperCase(),
          categoria: (r.categoria || 'ACAO').toUpperCase(),
          operacao: (r.operacao || 'COMPRA').toUpperCase(),
          quantidade: r.quantidade ?? '',
          preco_entrada: r.preco_entrada ?? '',
          preco_fechamento: r.preco_fechamento ?? '',
          data_abertura: r.data_abertura || '',
          data_fechamento: r.data_fechamento || '',
          strike: r.strike ?? '',
          vencimento: r.vencimento || '',
          resultado_valor: r.resultado_valor ?? '',
          resultado_pct: r.resultado_pct ?? '',
        };
        row._error = validateRow(row);
        return row;
      });
      setPreview(parsed);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setProcessing(false); }
  };

  const updateRow = (i, field, value) => {
    setPreview((p) => {
      const next = p.slice();
      next[i] = { ...next[i], [field]: value };
      next[i]._error = validateRow(next[i]);
      return next;
    });
  };

  const removeRow = (i) => {
    setPreview((p) => p.filter((_, idx) => idx !== i));
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const valid = preview.filter((r) => !r._error);
    if (!valid.length) return;
    setSaving(true); setError('');
    try {
      const existing = await base44.entities.GrupoOperacao.list();
      const byName = {};
      (existing || []).forEach((g) => { byName[g.nome.toLowerCase()] = g; });
      const ensureGroup = async (nome) => {
        const key = (nome || '').toLowerCase();
        if (byName[key]) return byName[key];
        const g = await base44.entities.GrupoOperacao.create({ nome });
        byName[key] = g;
        return g;
      };

      const records = [];
      for (const r of valid) {
        const grupo = await ensureGroup(r.identificador);
        const operacao = r.operacao;
        const quantidade = num(r.quantidade);
        const precoEntrada = num(r.preco_entrada);
        const precoFechamento = num(r.preco_fechamento);
        const rv = r.resultado_valor !== '' && r.resultado_valor != null ? num(r.resultado_valor) : calcResultadoValor(operacao, quantidade, precoEntrada, precoFechamento);
        const rp = r.resultado_pct !== '' && r.resultado_pct != null ? num(r.resultado_pct) : calcResultadoPct(operacao, precoEntrada, precoFechamento);
        records.push({
          grupo_id: grupo.id, grupo_nome: grupo.nome,
          ativo: r.ativo, ativo_base: r.ativo_base || null, categoria: r.categoria, operacao,
          quantidade, preco_entrada: precoEntrada, valor_inicial: calcValorInicial(operacao, quantidade, precoEntrada),
          data_abertura: r.data_abertura || null, strike: num(r.strike), vencimento: r.vencimento || null,
          status: 'FECHADA', preco_fechamento: precoFechamento, resultado_valor: rv, resultado_pct: rp,
          data_fechamento: toDate(r.data_fechamento),
        });
      }

      const createdRecs = await base44.entities.Operacao.bulkCreate(records);
      setResult({ created: createdRecs?.length || records.length });
      setPreview(null);
      setFile(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/historico')} title="Voltar"><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Importar Histórico de Operações</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> Planilha Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Baixe a planilha modelo abaixo e preencha com suas operações já encerradas. Utilize ponto e vírgula (;) como separador e vírgula (,) para decimais.</p>
            <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-1" /> Baixar planilha modelo (CSV)</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li><b>identificador</b>: nome do grupo/identificador da operação (será criado se não existir).</li>
              <li><b>ativo</b>: ticker do ativo (ex.: PETR4, BBDCI201).</li>
              <li><b>ativo_base</b>: ativo base para opções (vazio para ações).</li>
              <li><b>categoria</b>: ACAO, CALL, PUT ou DOLLAR.</li>
              <li><b>operacao</b>: COMPRA ou VENDA.</li>
              <li><b>quantidade, preco_entrada, preco_fechamento</b>: valores numéricos (vírgula decimal).</li>
              <li><b>data_abertura, data_fechamento</b>: formato AAAA-MM-DD (ex.: 2026-01-20).</li>
              <li><b>strike, vencimento</b>: preencha apenas para opções.</li>
              <li><b>resultado_valor, resultado_pct</b>: opcionais — se em branco, serão calculados automaticamente.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importar arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:bg-transparent file:text-sm file:font-medium file:cursor-pointer hover:file:bg-accent"
              />
              <Button onClick={handlePreview} disabled={!file || processing}>
                <Upload className="w-4 h-4 mr-1" /> {processing ? 'Lendo arquivo...' : 'Visualizar dados'}
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {result && (
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <p className="font-medium">Importação concluída</p>
                <p className="text-emerald-600">{result.created} operação(ões) importada(s) com sucesso.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/historico')}>Ver histórico</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Validar dados antes de confirmar</CardTitle>
            </CardHeader>
            <CardContent>
              <ImportarPreviewTable
                rows={preview}
                onChange={updateRow}
                onRemove={removeRow}
                onConfirm={handleConfirm}
                onCancel={() => setPreview(null)}
                saving={saving}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}