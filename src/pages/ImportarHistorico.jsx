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
  ['Exemplo', 'PETR4', '', 'DIV', '', '100', '0,80', '2026-01-15', '', '', '', '', '', '2026-02-15'],
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
          categoria: { type: 'string' },
          operacao: { type: 'string' },
          quantidade: { type: 'string' },
          preco_entrada: { type: 'string' },
          data_abertura: { type: 'string' },
          strike: { type: 'string' },
          vencimento: { type: 'string' },
          preco_fechamento: { type: 'string' },
          resultado_valor: { type: 'string' },
          resultado_pct: { type: 'string' },
          data_fechamento: { type: 'string' },
        },
      },
    },
  },
};

const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR', 'DIV'];
const OPERACOES = ['COMPRA', 'VENDA'];

const normalizeStr = (v) => (v == null ? '' : String(v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());
const normalizeCategoria = (v) => {
  const s = normalizeStr(v);
  if (s === 'A') return 'ACAO';
  return s;
};
const normalizeOperacao = (v, categoria) => {
  const s = normalizeStr(v);
  if (s === 'COMPRA' || s === 'C') return 'COMPRA';
  if (s === 'VENDA' || s === 'V') return 'VENDA';
  return categoria === 'DIV' ? '' : (OPERACOES.includes(s) ? s : '');
};
const excelDateToISO = (serial) => {
  const n = Number(serial);
  if (Number.isNaN(n) || n < 1000) return null;
  const utcDays = Math.floor(n - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};
const normalizeDate = (v) => {
  if (!v || v === '0') return '';
  let s = String(v).trim();
  if (s.toUpperCase().startsWith('R$')) s = s.substring(2).trim();
  if (s === '' || s === '-' || s === '0') return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}`; }
  if (/^\d{4,5}$/.test(s)) { const iso = excelDateToISO(Number(s)); if (iso) return iso; }
  return s;
};

const cleanNumStr = (v) => {
  if (v == null) return '';
  let s = String(v).trim();
  let neg = false;
  if (s.startsWith('-')) { neg = true; s = s.substring(1).trim(); }
  if (s.toUpperCase().startsWith('R$')) s = s.substring(2).trim();
  if (s.startsWith('-')) { neg = true; s = s.substring(1).trim(); }
  if (s === '-' || s === '') return '';
  return neg ? '-' + s : s;
};
const num = (v) => {
  const s = cleanNumStr(v);
  if (s === '') return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

const splitCSVLine = (line, delim = ';') => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === delim && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
};

const parseCSV = (text) => {
  const clean = text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Detect delimiter: ; , or tab
  const firstLine = lines[0];
  const delim = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const headers = splitCSVLine(lines[0], delim).map((h) =>
    h.trim().toLowerCase().replace(/^\ufeff/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i], delim);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
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
  if (r.categoria === 'DIV') {
    if (num(r.quantidade) == null || num(r.quantidade) <= 0) return 'Quantidade inválida';
    const temTotal = num(r.resultado_valor) != null && num(r.resultado_valor) > 0;
    if (!temTotal && (num(r.preco_entrada) == null || num(r.preco_entrada) <= 0)) return 'Valor por ação ou resultado_total inválido';
    if (!r.data_fechamento) return 'Data de pagamento (data_fechamento) obrigatória';
    return null;
  }
  if (!OPERACOES.includes(r.operacao)) return 'Operação inválida';
  if (num(r.quantidade) == null || num(r.quantidade) <= 0) return 'Quantidade inválida';
  if (num(r.preco_entrada) == null || num(r.preco_entrada) <= 0) return 'Preço de entrada inválido';
  return null;
};

const normalizeRow = (r) => {
  const categoria = normalizeCategoria(r.categoria);
  const operacao = normalizeOperacao(r.operacao, categoria);
  const rawAtivoBase = normalizeStr(r.ativo_base);
  return {
    identificador: r.identificador ? String(r.identificador).trim() : '',
    ativo: normalizeStr(r.ativo),
    ativo_base: (rawAtivoBase === '0' || rawAtivoBase === '') ? '' : rawAtivoBase,
    categoria,
    operacao,
    quantidade: cleanNumStr(r.quantidade),
    preco_entrada: cleanNumStr(r.preco_entrada),
    preco_fechamento: cleanNumStr(r.preco_fechamento),
    data_abertura: r.data_abertura ? normalizeDate(r.data_abertura) : '',
    data_fechamento: r.data_fechamento ? normalizeDate(r.data_fechamento) : '',
    strike: cleanNumStr(r.strike),
    vencimento: r.vencimento ? normalizeDate(r.vencimento) : '',
    resultado_valor: cleanNumStr(r.resultado_valor),
    resultado_pct: cleanNumStr(r.resultado_pct),
  };
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
      let rows;
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      if (isCSV) {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        const up = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: up.file_url, json_schema: SCHEMA });
        rows = (res.output && res.output.rows) || (Array.isArray(res.output) ? res.output : []);
      }
      if (!rows.length) { setError('Nenhuma operação encontrada no arquivo.'); setProcessing(false); return; }

      const parsed = rows.map((r) => {
        const row = normalizeRow(r);
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

      // Build dedup keys from existing records
      const existingOps = await base44.entities.Operacao.filter({}, '-created_date', 5000);
      const existingDivs = await base44.entities.Dividendo.filter({}, '-created_date', 5000);
      const opKeys = new Set((existingOps || []).map((o) =>
        `${o.grupo_id}|${o.ativo}|${o.operacao}|${o.quantidade}|${o.preco_entrada}|${o.data_abertura || ''}`
      ));
      const divKeys = new Set((existingDivs || []).map((d) =>
        `${d.grupo_id}|${d.ativo}|${d.quantidade}|${d.valor_por_acao}|${d.data_pagamento || ''}`
      ));

      const opRecords = [];
      const divRecords = [];
      let skippedOps = 0, skippedDivs = 0;
      for (const r of valid) {
        const grupo = await ensureGroup(r.identificador);
        if (r.categoria === 'DIV') {
          const quantidade = num(r.quantidade);
          let valorPorAcao = num(r.preco_entrada);
          let valorTotal = r.resultado_valor !== '' && r.resultado_valor != null ? num(r.resultado_valor) : null;
          if ((!valorPorAcao || valorPorAcao <= 0) && valorTotal && quantidade) {
            valorPorAcao = valorTotal / quantidade;
          }
          if (valorTotal == null) valorTotal = quantidade * valorPorAcao;
          const key = `${grupo.id}|${r.ativo}|${quantidade}|${valorPorAcao}|${r.data_fechamento || ''}`;
          if (divKeys.has(key)) { skippedDivs++; continue; }
          divKeys.add(key);
          divRecords.push({
            grupo_id: grupo.id, grupo_nome: grupo.nome,
            ativo: r.ativo, data_pagamento: r.data_fechamento,
            quantidade, valor_por_acao: valorPorAcao, valor_total: valorTotal,
          });
        } else {
          const operacao = r.operacao;
          const quantidade = num(r.quantidade);
          const precoEntrada = num(r.preco_entrada);
          const precoFechamento = num(r.preco_fechamento);
          const isAberta = precoFechamento == null;
          const rv = !isAberta ? calcResultadoValor(operacao, quantidade, precoEntrada, precoFechamento) : null;
          const rp = !isAberta ? calcResultadoPct(operacao, precoEntrada, precoFechamento) : null;
          const key = `${grupo.id}|${r.ativo}|${operacao}|${quantidade}|${precoEntrada}|${r.data_abertura || ''}`;
          if (opKeys.has(key)) { skippedOps++; continue; }
          opKeys.add(key);
          opRecords.push({
            grupo_id: grupo.id, grupo_nome: grupo.nome,
            ativo: r.ativo, ativo_base: r.ativo_base || null, categoria: r.categoria, operacao,
            quantidade, preco_entrada: precoEntrada, valor_inicial: calcValorInicial(operacao, quantidade, precoEntrada),
            data_abertura: r.data_abertura || null, strike: num(r.strike), vencimento: r.vencimento || null,
            status: isAberta ? 'ABERTA' : 'FECHADA', preco_fechamento: precoFechamento, resultado_valor: rv, resultado_pct: rp,
            data_fechamento: isAberta ? null : toDate(r.data_fechamento),
          });
        }
      }

      const BATCH_SIZE = 400;
      let createdOps = 0, createdDivs = 0;
      for (let i = 0; i < opRecords.length; i += BATCH_SIZE) {
        const batch = opRecords.slice(i, i + BATCH_SIZE);
        const c = await base44.entities.Operacao.bulkCreate(batch);
        createdOps += c?.length || batch.length;
      }
      for (let i = 0; i < divRecords.length; i += BATCH_SIZE) {
        const batch = divRecords.slice(i, i + BATCH_SIZE);
        const c = await base44.entities.Dividendo.bulkCreate(batch);
        createdDivs += c?.length || batch.length;
      }
      setResult({ createdOps, createdDivs, skippedOps, skippedDivs });
      setPreview(null);
      setFile(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
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
              <li><b>categoria</b>: ACAO, CALL, PUT, DOLLAR ou DIV (dividendos).</li>
              <li><b>operacao</b>: COMPRA ou VENDA (deixe em branco para DIV).</li>
              <li><b>quantidade, preco_entrada, preco_fechamento</b>: valores numéricos (vírgula decimal).</li>
              <li><b>data_abertura, data_fechamento</b>: formato AAAA-MM-DD (ex.: 2026-01-20).</li>
              <li><b>strike, vencimento</b>: preencha apenas para opções.</li>
              <li><b>resultado_valor, resultado_pct</b>: ignorados — sempre calculados automaticamente a partir dos preços de entrada e fechamento.</li>
              <li><b>DIV (dividendos)</b>: usar <b>quantidade</b> = nº de ações, <b>preco_entrada</b> = valor por ação e <b>data_fechamento</b> = data de pagamento; <b>resultado_valor</b> (opcional) = valor total.</li>
            </ul>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <b>Campos obrigatórios:</b> identificador, ativo, categoria e quantidade. Para operações (ACAO/CALL/PUT/DOLLAR): também operacao e preco_entrada (preco_fechamento opcional — se vazio, a operação fica como ABERTA). Para DIV (dividendos): também data_fechamento (data de pagamento) e pelo menos preco_entrada (valor por ação) ou resultado_valor (valor total). Os campos resultado_valor e resultado_pct são sempre calculados automaticamente.
            </div>
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
                <p className="text-emerald-600">{result.createdOps} operação(ões) importada(s) com sucesso.</p>
                {result.createdDivs > 0 && <p className="text-emerald-600">{result.createdDivs} dividendo(s) importado(s) com sucesso.</p>}
                {(result.skippedOps > 0 || result.skippedDivs > 0) && (
                  <p className="text-muted-foreground">{result.skippedOps} operação(ões) e {result.skippedDivs} dividendo(s) duplicado(s) ignorado(s).</p>
                )}
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