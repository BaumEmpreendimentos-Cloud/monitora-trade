import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TICKERS = 24;

// Mapa curado Ticker B3 -> CNPJ oficial CVM + classe de ação para extração precisa do LPA (3.99.01.*)
const B3_CVM_REGISTRY = {
  PETR3: { cnpj: '33.000.167/0001-01', company: 'Petrobras', sector: 'Petróleo & Gás', shareClass: 'ON' },
  PETR4: { cnpj: '33.000.167/0001-01', company: 'Petrobras', sector: 'Petróleo & Gás', shareClass: 'PN' },
  VALE3: { cnpj: '33.592.510/0001-54', company: 'Vale', sector: 'Mineração', shareClass: 'ON' },
  ITUB3: { cnpj: '60.872.504/0001-23', company: 'Itaú Unibanco', sector: 'Financeiro', shareClass: 'ON' },
  ITUB4: { cnpj: '60.872.504/0001-23', company: 'Itaú Unibanco', sector: 'Financeiro', shareClass: 'PN' },
  BBAS3: { cnpj: '00.000.000/0001-91', company: 'Banco do Brasil', sector: 'Financeiro', shareClass: 'ON' },
  BBDC3: { cnpj: '60.746.948/0001-12', company: 'Bradesco', sector: 'Financeiro', shareClass: 'ON' },
  BBDC4: { cnpj: '60.746.948/0001-12', company: 'Bradesco', sector: 'Financeiro', shareClass: 'PN' },
  WEGE3: { cnpj: '84.429.695/0001-11', company: 'WEG', sector: 'Bens Industriais', shareClass: 'ON' },
  B3SA3: { cnpj: '09.346.601/0001-25', company: 'B3', sector: 'Financeiro', shareClass: 'ON' },
  ABEV3: { cnpj: '07.526.557/0001-00', company: 'Ambev', sector: 'Consumo Não Cíclico', shareClass: 'ON' },
  BRKM5: { cnpj: '42.150.391/0001-70', company: 'Braskem', sector: 'Químicos & Petroquímica', shareClass: 'PNA' },
  PRIO3: { cnpj: '10.629.105/0001-68', company: 'PRIO', sector: 'Petróleo & Gás', shareClass: 'ON' },
  SUZB3: { cnpj: '16.404.287/0001-55', company: 'Suzano', sector: 'Papel & Celulose', shareClass: 'ON' },
  KLBN11: { cnpj: '89.637.490/0001-45', company: 'Klabin', sector: 'Papel & Celulose', shareClass: 'UNIT' },
  GGBR4: { cnpj: '33.611.500/0001-19', company: 'Gerdau', sector: 'Siderurgia', shareClass: 'PN' },
  CSNA3: { cnpj: '33.042.730/0001-04', company: 'CSN', sector: 'Siderurgia', shareClass: 'ON' },
  USIM5: { cnpj: '60.894.730/0001-05', company: 'Usiminas', sector: 'Siderurgia', shareClass: 'PNA' },
  CMIN3: { cnpj: '08.902.291/0001-15', company: 'CSN Mineração', sector: 'Mineração', shareClass: 'ON' },
  RENT3: { cnpj: '16.670.085/0001-55', company: 'Localiza', sector: 'Consumo Cíclico', shareClass: 'ON' },
  LREN3: { cnpj: '92.754.738/0001-62', company: 'Lojas Renner', sector: 'Varejo', shareClass: 'ON' },
  MGLU3: { cnpj: '47.960.950/0001-21', company: 'Magazine Luiza', sector: 'Varejo', shareClass: 'ON' },
  RADL3: { cnpj: '61.585.865/0001-51', company: 'Raia Drogasil', sector: 'Saúde & Varejo', shareClass: 'ON' },
  ELET3: { cnpj: '00.001.180/0001-26', company: 'Eletrobras', sector: 'Energia Elétrica', shareClass: 'ON' },
  ELET6: { cnpj: '00.001.180/0001-26', company: 'Eletrobras', sector: 'Energia Elétrica', shareClass: 'PNB' },
  EQTL3: { cnpj: '03.220.438/0001-73', company: 'Equatorial', sector: 'Energia Elétrica', shareClass: 'ON' },
  EGIE3: { cnpj: '02.474.103/0001-19', company: 'Engie Brasil', sector: 'Energia Elétrica', shareClass: 'ON' },
  CMIG4: { cnpj: '17.155.730/0001-64', company: 'Cemig', sector: 'Energia Elétrica', shareClass: 'PN' },
  CPLE6: { cnpj: '76.483.817/0001-20', company: 'Copel', sector: 'Energia Elétrica', shareClass: 'PNB' },
  TAEE11: { cnpj: '07.859.971/0001-30', company: 'Taesa', sector: 'Energia Elétrica', shareClass: 'UNIT' },
  SBSP3: { cnpj: '43.776.517/0001-80', company: 'Sabesp', sector: 'Saneamento', shareClass: 'ON' },
  VIVT3: { cnpj: '02.558.157/0001-62', company: 'Telefônica Brasil (Vivo)', sector: 'Telecomunicações', shareClass: 'ON' },
  TIMS3: { cnpj: '02.421.421/0001-11', company: 'TIM', sector: 'Telecomunicações', shareClass: 'ON' },
  EMBR3: { cnpj: '07.689.002/0001-89', company: 'Embraer', sector: 'Bens Industriais', shareClass: 'ON' },
  BPAC11: { cnpj: '30.306.294/0001-45', company: 'BTG Pactual', sector: 'Financeiro', shareClass: 'UNIT' },
  SANB11: { cnpj: '90.400.888/0001-42', company: 'Santander Brasil', sector: 'Financeiro', shareClass: 'UNIT' },
  BBSE3: { cnpj: '17.344.597/0001-94', company: 'BB Seguridade', sector: 'Seguros', shareClass: 'ON' },
  CXSE3: { cnpj: '34.020.354/0001-10', company: 'Caixa Seguridade', sector: 'Seguros', shareClass: 'ON' },
  PSSA3: { cnpj: '02.149.205/0001-69', company: 'Porto', sector: 'Seguros', shareClass: 'ON' },
  ITSA4: { cnpj: '61.532.644/0001-15', company: 'Itaúsa', sector: 'Holding Financeira', shareClass: 'PN' },
  TOTS3: { cnpj: '53.113.791/0001-22', company: 'TOTVS', sector: 'Tecnologia', shareClass: 'ON' },
  RDOR3: { cnpj: '06.047.087/0001-39', company: 'Rede D\'Or', sector: 'Saúde', shareClass: 'ON' },
  HAPV3: { cnpj: '05.197.443/0001-38', company: 'Hapvida', sector: 'Saúde', shareClass: 'ON' },
  HYPE3: { cnpj: '02.932.074/0001-91', company: 'Hypera', sector: 'Saúde', shareClass: 'ON' },
  RAIL3: { cnpj: '02.387.241/0001-60', company: 'Rumo', sector: 'Logística', shareClass: 'ON' },
  VBBR3: { cnpj: '34.274.233/0001-02', company: 'Vibra Energia', sector: 'Petróleo & Distribuição', shareClass: 'ON' },
  UGPA3: { cnpj: '33.256.439/0001-39', company: 'Ultrapar', sector: 'Petróleo & Distribuição', shareClass: 'ON' },
  CSAN3: { cnpj: '50.746.577/0001-15', company: 'Cosan', sector: 'Energia & Agronegócio', shareClass: 'ON' },
  BRFS3: { cnpj: '01.838.723/0001-27', company: 'BRF', sector: 'Alimentos', shareClass: 'ON' },
  BEEF3: { cnpj: '67.620.377/0001-14', company: 'Minerva', sector: 'Alimentos', shareClass: 'ON' },
  SMTO3: { cnpj: '51.466.860/0001-56', company: 'São Martinho', sector: 'Agronegócio', shareClass: 'ON' },
  SLCE3: { cnpj: '89.096.457/0001-55', company: 'SLC Agrícola', sector: 'Agronegócio', shareClass: 'ON' },
  MULT3: { cnpj: '07.816.890/0001-53', company: 'Multiplan', sector: 'Shoppings', shareClass: 'ON' },
  CYRE3: { cnpj: '73.178.600/0001-18', company: 'Cyrela', sector: 'Construção Civil', shareClass: 'ON' },
  ASAI3: { cnpj: '06.057.223/0001-71', company: 'Assaí', sector: 'Varejo Alimentar', shareClass: 'ON' },
  ENEV3: { cnpj: '04.423.567/0001-21', company: 'Eneva', sector: 'Energia Elétrica', shareClass: 'ON' },
};

const toList = (res) => (Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []));
const round2 = (n) => (n !== null && Number.isFinite(n) ? Number(n.toFixed(2)) : null);

function scaleDivisor(escala) {
  const u = String(escala || '').toUpperCase().trim();
  if (u === 'MIL') return 1000;
  return 1000000;
}

function shouldReplace(current, endDate, version) {
  if (!current) return 'replace';
  if (endDate > current.endDate) return 'replace';
  if (endDate < current.endDate) return 'skip';
  if (version > current.version) return 'replace';
  if (version < current.version) return 'skip';
  return 'same';
}

// ---------- Leitor de ZIP em fluxo (sem carregar o CSV inteiro na memória) ----------

const u16 = (dv, off) => dv.getUint16(off, true);
const u32 = (dv, off) => dv.getUint32(off, true);

function listZipEntries(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  const min = Math.max(0, buf.byteLength - 66000);
  for (let i = buf.byteLength - 22; i >= min; i--) {
    if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
  }
  const map = new Map();
  if (eocd < 0) return map;
  const total = u16(dv, eocd + 10);
  let off = u32(dv, eocd + 16);
  for (let i = 0; i < total; i++) {
    if (off + 46 > buf.byteLength || u32(dv, off) !== 0x02014b50) break;
    const method = u16(dv, off + 10);
    const compSize = u32(dv, off + 20);
    const nameLen = u16(dv, off + 28);
    const extraLen = u16(dv, off + 30);
    const commentLen = u16(dv, off + 32);
    const localOff = u32(dv, off + 42);
    const name = new TextDecoder('utf-8').decode(new Uint8Array(buf, off + 46, nameLen));
    map.set(name, { method, compSize, localOff });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return map;
}

function entryStream(buf, entry) {
  const dv = new DataView(buf);
  const nameLen = u16(dv, entry.localOff + 26);
  const extraLen = u16(dv, entry.localOff + 28);
  const start = entry.localOff + 30 + nameLen + extraLen;
  const bytes = new Uint8Array(buf, start, entry.compSize);
  const stream = new Blob([bytes]).stream();
  return entry.method === 0 ? stream : stream.pipeThrough(new DecompressionStream('deflate-raw'));
}

function makeLineProcessor(targetCnpjs, byCnpj, kind) {
  const isItrDre = kind === 'itr_dre';
  let idx = null;

  return (rawLine) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line) return;
    const cols = line.split(';');

    if (!idx) {
      const h = (name) => cols.indexOf(name);
      const found = {
        cnpj: h('CNPJ_CIA'), ver: h('VERSAO'), esc: h('ESCALA_MOEDA'), ord: h('ORDEM_EXERC'),
        ini: h('DT_INI_EXERC'), fim: h('DT_FIM_EXERC'), cd: h('CD_CONTA'), ds: h('DS_CONTA'), val: h('VL_CONTA'),
      };
      const invalid = found.cnpj < 0 || found.cd < 0 || found.val < 0 || found.ord < 0 || found.fim < 0;
      idx = invalid ? { invalid: true } : found;
      return;
    }
    if (idx.invalid) return;

    const cnpj = cols[idx.cnpj];
    if (!targetCnpjs.has(cnpj)) return;

    const ordem = cols[idx.ord];
    if (!isItrDre && ordem !== 'ÚLTIMO') return;
    if (isItrDre && ordem !== 'ÚLTIMO' && ordem !== 'PENÚLTIMO') return;

    const endDate = cols[idx.fim] || '';
    const startDate = idx.ini >= 0 ? (cols[idx.ini] || '') : '';
    if (isItrDre && startDate && !startDate.endsWith('-01-01')) return;

    const cd = cols[idx.cd] || '';
    if (cd.split('.').length > 3 && !cd.startsWith('3.99')) return;

    const val = Number(cols[idx.val]);
    if (!Number.isFinite(val)) return;
    const version = Number(cols[idx.ver]) || 1;

    let comp = byCnpj.get(cnpj);
    if (!comp) {
      comp = { dfpDre: null, dfpBpa: null, dfpBpp: null, itrDreCur: null, itrDrePrev: null, itrBpa: null, itrBpp: null };
      byCnpj.set(cnpj, comp);
    }

    const slot = kind === 'dfp_dre' ? 'dfpDre'
      : kind === 'dfp_bpa' ? 'dfpBpa'
      : kind === 'dfp_bpp' ? 'dfpBpp'
      : kind === 'itr_bpa' ? 'itrBpa'
      : kind === 'itr_bpp' ? 'itrBpp'
      : (ordem === 'ÚLTIMO' ? 'itrDreCur' : 'itrDrePrev');

    const dec = shouldReplace(comp[slot], endDate, version);
    if (dec === 'skip') return;
    if (dec === 'replace') {
      comp[slot] = { version, endDate, divisor: scaleDivisor(idx.esc >= 0 ? cols[idx.esc] : 'MIL'), accounts: new Map() };
    }
    comp[slot].accounts.set(cd, { desc: idx.ds >= 0 ? cols[idx.ds] : '', value: val });
  };
}

async function ingestEntry(buf, entry, processLine) {
  const decoder = new TextDecoder('windows-1252');
  const reader = entryStream(buf, entry).getReader();
  let pending = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() || '';
    for (const line of lines) processLine(line.replace(/^\uFEFF/, ''));
  }
  pending += decoder.decode();
  if (pending) processLine(pending.replace(/^\uFEFF/, ''));
}

async function fetchCvmPackage(kind, year) {
  const safeYear = Math.trunc(year);
  if (safeYear < 2020 || safeYear > 2035) return null;
  const prefix = kind === 'DFP' ? 'dfp' : 'itr';
  const url = `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/${kind}/DADOS/${prefix}_cia_aberta_${safeYear}.zip`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const entries = listZipEntries(buf);
    if (!entries.size) return null;
    return { buf, entries, prefix, year: safeYear };
  } catch (error) {
    console.log('fetchCvmPackage falhou', kind, safeYear, error?.message);
    return null;
  }
}

async function extractPackage(pkg, targetCnpjs, byCnpj) {
  const files = [
    [`${pkg.prefix}_cia_aberta_DRE_con_${pkg.year}.csv`, `${pkg.prefix}_dre`],
    [`${pkg.prefix}_cia_aberta_BPA_con_${pkg.year}.csv`, `${pkg.prefix}_bpa`],
    [`${pkg.prefix}_cia_aberta_BPP_con_${pkg.year}.csv`, `${pkg.prefix}_bpp`],
  ];
  for (const [name, kind] of files) {
    const entry = pkg.entries.get(name);
    if (!entry) continue;
    await ingestEntry(pkg.buf, entry, makeLineProcessor(targetCnpjs, byCnpj, kind));
  }
}

// ---------- Extração dos indicadores ----------

const getScaled = (p, cd) => (p?.accounts.has(cd) ? p.accounts.get(cd).value / p.divisor : null);
const findScaled = (p, fn) => {
  if (!p) return null;
  for (const [cd, entry] of p.accounts.entries()) {
    if (fn(cd, entry.desc)) return entry.value / p.divisor;
  }
  return null;
};

function extractNetIncomeM(p) {
  const ctrl = findScaled(p, (cd, ds) =>
    cd.split('.').length === 3 && (cd.startsWith('3.11.') || cd.startsWith('3.09.')) &&
    /controlador/i.test(ds) && !/n[ãa]o controlador/i.test(ds)
  );
  if (ctrl !== null) return ctrl;
  const cons = findScaled(p, (cd, ds) =>
    cd.split('.').length === 2 && cd.startsWith('3.') && /^(lucro|resultado|preju[ií]zo).*consolidado do per/i.test(ds)
  );
  return cons ?? getScaled(p, '3.11') ?? getScaled(p, '3.09');
}

function extractEquityM(bpp) {
  const byDesc = findScaled(bpp, (cd, ds) => cd.split('.').length === 2 && cd.startsWith('2.') && /^patrim[ôo]nio l[íi]quido/i.test(ds));
  return byDesc ?? getScaled(bpp, '2.03') ?? getScaled(bpp, '2.07') ?? getScaled(bpp, '2.08');
}

function extractEps(p, shareClass) {
  if (!p) return null;
  const leaves = [];
  for (const [cd, entry] of p.accounts.entries()) {
    if (cd.startsWith('3.99.01.') && entry.value !== 0) {
      leaves.push({ desc: entry.desc.toUpperCase().trim(), value: entry.value });
    }
  }
  if (leaves.length) {
    const target = shareClass === 'UNIT' ? 'PN' : shareClass;
    return leaves.find((l) => l.desc === target || l.desc.includes(target))?.value
      ?? leaves.find((l) => l.desc === 'ON' || l.desc.includes('ORDIN'))?.value
      ?? leaves[0].value;
  }
  const b = p.accounts.get('3.99.01');
  if (b && b.value !== 0) return b.value;
  const r = p.accounts.get('3.99');
  return r && r.value !== 0 ? r.value : null;
}

function isBank(dre, bpp) {
  if (/intermedia[çc][ãa]o financeira|opera[çc][õo]es de seguros/i.test(dre?.accounts.get('3.01')?.desc || '')) return true;
  if (/patrim[ôo]nio l[íi]quido/i.test(bpp?.accounts.get('2.07')?.desc || '')) return true;
  if (/patrim[ôo]nio l[íi]quido/i.test(bpp?.accounts.get('2.08')?.desc || '')) return true;
  return false;
}

function fmtPeriodo(endDate) {
  const [y, m] = String(endDate || '').split('-');
  if (!y || !m) return endDate || 'Sem balanço';
  if (m === '03') return `1T${y.slice(-2)} (LTM)`;
  if (m === '06') return `2T${y.slice(-2)} (LTM)`;
  if (m === '09') return `3T${y.slice(-2)} (LTM)`;
  if (m === '12') return `DFP ${y}`;
  return endDate;
}

const ltm = (dfp, cur, prev, ok) => (ok && dfp !== null && cur !== null && prev !== null ? dfp + cur - prev : dfp);

function buildRecord(ticker, meta, stmt, nowIso) {
  const { dfpDre, itrDreCur, itrDrePrev } = stmt;
  const hasItr = Boolean(dfpDre && itrDreCur && itrDrePrev && itrDreCur.endDate > dfpDre.endDate && itrDreCur.endDate.slice(5) === itrDrePrev.endDate.slice(5));
  const bpa = stmt.itrBpa && (!stmt.dfpBpa || stmt.itrBpa.endDate > stmt.dfpBpa.endDate) ? stmt.itrBpa : stmt.dfpBpa;
  const bpp = stmt.itrBpp && (!stmt.dfpBpp || stmt.itrBpp.endDate > stmt.dfpBpp.endDate) ? stmt.itrBpp : stmt.dfpBpp;

  const fin = isBank(itrDreCur ?? dfpDre, bpp);
  const receita = ltm(getScaled(dfpDre, '3.01'), getScaled(itrDreCur, '3.01'), getScaled(itrDrePrev, '3.01'), hasItr);
  const ebit = fin ? null : ltm(getScaled(dfpDre, '3.05'), getScaled(itrDreCur, '3.05'), getScaled(itrDrePrev, '3.05'), hasItr);
  const lucro = ltm(extractNetIncomeM(dfpDre), extractNetIncomeM(itrDreCur), extractNetIncomeM(itrDrePrev), hasItr);
  const lpa = ltm(extractEps(dfpDre, meta.shareClass), extractEps(itrDreCur, meta.shareClass), extractEps(itrDrePrev, meta.shareClass), hasItr);
  const ativo = getScaled(bpa, '1');
  const pl = extractEquityM(bpp);

  const caixa = !fin && bpa ? (getScaled(bpa, '1.01.01') ?? 0) + (getScaled(bpa, '1.01.02') ?? 0) : null;
  const divBruta = !fin && bpp ? (getScaled(bpp, '2.01.04') ?? 0) + (getScaled(bpp, '2.02.01') ?? 0) : null;
  const divLiq = divBruta !== null && caixa !== null ? divBruta - caixa : null;

  const roe = lucro !== null && pl !== null && pl > 0 ? (lucro / pl) * 100 : null;
  const roa = lucro !== null && ativo !== null && ativo > 0 ? (lucro / ativo) * 100 : null;
  const mgLiq = lucro !== null && receita !== null && Math.abs(receita) > 0 ? (lucro / receita) * 100 : null;
  const mgEbit = !fin && ebit !== null && receita !== null && Math.abs(receita) > 0 ? (ebit / receita) * 100 : null;
  const dlPl = !fin && divLiq !== null && pl !== null && pl > 0 ? divLiq / pl : null;
  const dlEbit = !fin && divLiq !== null && ebit !== null && ebit > 0 ? divLiq / ebit : null;

  let vpa = null;
  if (lpa !== null && Math.abs(lpa) > 0.001 && lucro !== null && Math.abs(lucro) > 1 && pl !== null && pl > 0 && Math.sign(lpa) === Math.sign(lucro)) {
    const sharesM = lucro / lpa;
    if (sharesM > 0) vpa = pl / sharesM;
  }

  const refDate = hasItr ? itrDreCur.endDate : (bpp?.endDate || dfpDre?.endDate || '');
  return {
    ativo_base: ticker,
    cnpj: meta.cnpj,
    razao_social: meta.company,
    setor: meta.sector,
    instituicao_financeira: fin,
    periodo_ref: fmtPeriodo(refDate),
    data_referencia: refDate,
    receita_ltm_m: round2(receita),
    ebit_ltm_m: round2(ebit),
    lucro_liquido_ltm_m: round2(lucro),
    ativo_total_m: round2(ativo),
    patrimonio_liquido_m: round2(pl),
    caixa_m: round2(caixa),
    divida_bruta_m: round2(divBruta),
    divida_liquida_m: round2(divLiq),
    roe_pct: round2(roe),
    roa_pct: round2(roa),
    margem_liquida_pct: round2(mgLiq),
    margem_ebit_pct: round2(mgEbit),
    divida_liquida_pl: round2(dlPl),
    divida_liquida_ebit: round2(dlEbit),
    lpa_ltm: round2(lpa),
    vpa: round2(vpa),
    fonte: hasItr ? 'CVM Dados Abertos (DFP + ITR)' : 'CVM Dados Abertos (DFP)',
    atualizado_em: nowIso,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const force = Boolean(body?.force);
    const reqTickers = Array.isArray(body?.tickers) && body.tickers.length
      ? [...new Set(body.tickers.map((t) => String(t || '').toUpperCase().trim()).filter((t) => /^[A-Z0-9]{4,10}$/.test(t)))].slice(0, MAX_TICKERS)
      : ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'BRKM5', 'PRIO3', 'B3SA3'];

    const mapped = reqTickers.filter((t) => Boolean(B3_CVM_REGISTRY[t]));
    const naoMapeados = reqTickers.filter((t) => !B3_CVM_REGISTRY[t]);
    if (!mapped.length) {
      return Response.json({ atualizados: 0, cacheados: 0, nao_mapeados: naoMapeados, items: [] });
    }

    const existentes = toList(
      await base44.asServiceRole.entities.FundamentoAtivo.filter({ ativo_base: { $in: mapped } }, { limit: 50 })
    );
    const porTicker = Object.fromEntries(existentes.map((r) => [r.ativo_base, r]));
    const now = Date.now();

    const pendentes = force
      ? mapped
      : mapped.filter((t) => {
          const ex = porTicker[t];
          if (!ex?.atualizado_em) return true;
          const age = now - Date.parse(ex.atualizado_em);
          return !Number.isFinite(age) || age > TTL_MS;
        });

    if (!pendentes.length) {
      return Response.json({
        atualizados: 0,
        cacheados: mapped.length,
        nao_mapeados: naoMapeados,
        items: mapped.map((t) => porTicker[t]).filter(Boolean),
      });
    }

    const currentYear = new Date().getUTCFullYear();
    const targetCnpjs = new Set(pendentes.map((t) => B3_CVM_REGISTRY[t].cnpj));
    const byCnpj = new Map();

    // DFP: último exercício fechado (e o anterior como reserva)
    let dfp = await fetchCvmPackage('DFP', currentYear - 1);
    if (!dfp) dfp = await fetchCvmPackage('DFP', currentYear - 2);
    if (dfp) {
      await extractPackage(dfp, targetCnpjs, byCnpj);
      dfp = null;
    }

    // ITR: acumulado do exercício corrente (LTM = DFP + ITR atual - ITR anterior)
    for (const y of [currentYear, currentYear - 1]) {
      const itr = await fetchCvmPackage('ITR', y);
      if (itr) {
        await extractPackage(itr, targetCnpjs, byCnpj);
        break;
      }
    }

    const nowIso = new Date().toISOString();
    let atualizados = 0;

    for (const ticker of pendentes) {
      const meta = B3_CVM_REGISTRY[ticker];
      const stmt = byCnpj.get(meta.cnpj);
      if (!stmt) continue;
      const payload = buildRecord(ticker, meta, stmt, nowIso);
      if (body?.dry_run) {
        porTicker[ticker] = payload;
        atualizados += 1;
        continue;
      }
      const existente = porTicker[ticker];
      if (existente?.id) {
        porTicker[ticker] = await base44.asServiceRole.entities.FundamentoAtivo.update(existente.id, payload);
      } else {
        porTicker[ticker] = await base44.asServiceRole.entities.FundamentoAtivo.create(payload);
      }
      atualizados += 1;
    }

    return Response.json({
      atualizados,
      cacheados: mapped.length - pendentes.length,
      nao_mapeados: naoMapeados,
      items: mapped.map((t) => porTicker[t]).filter(Boolean),
    });
  } catch (error) {
    console.log('syncFundamentosCVM error', error?.message);
    return Response.json({ error: error?.message || 'Erro ao sincronizar CVM.' }, { status: 500 });
  }
}