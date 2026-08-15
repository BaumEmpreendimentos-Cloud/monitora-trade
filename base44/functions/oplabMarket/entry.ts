import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const API_BASE = 'https://api.oplab.com.br/v3';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = secrets.get('OPLAB_ACCESS_TOKEN');
    if (!token) return Response.json({ error: 'Token da OpLab não configurado.' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const headers = { 'Access-Token': token, 'Accept': 'application/json' };

    if (action === 'search') {
      const expr = (body.expr || '').toString().trim();
      if (!expr) return Response.json({ results: [] });
      const params = new URLSearchParams({
        expr,
        type: body.type || 'STOCK,OPTION',
        limit: String(body.limit || 20),
        add_info: 'true'
      });
      const res = await fetch(`${API_BASE}/market/instruments/search?${params}`, { headers });
      const text = await res.text();
      if (!res.ok) return Response.json({ error: `OpLab ${res.status}: ${text}` }, { status: res.status });
      return Response.json({ results: text ? JSON.parse(text) : [] });
    }

    if (action === 'optionChain') {
      const symbol = (body.symbol || '').toString().trim().toUpperCase();
      if (!symbol) return Response.json({ options: [] });
      const res = await fetch(`${API_BASE}/market/options/${encodeURIComponent(symbol)}`, { headers });
      const text = await res.text();
      if (!res.ok) return Response.json({ error: `OpLab ${res.status}: ${text}` }, { status: res.status });
      const data = text ? JSON.parse(text) : [];
      return Response.json({ options: Array.isArray(data) ? data : [data] });
    }

    if (action === 'quote') {
      const tickers = (body.tickers || '').toString().trim();
      if (!tickers) return Response.json({ quotes: [] });
      const params = new URLSearchParams({ tickers });
      const res = await fetch(`${API_BASE}/market/quote?${params}`, { headers });
      const text = await res.text();
      if (!res.ok) return Response.json({ error: `OpLab ${res.status}: ${text}` }, { status: res.status });
      const data = text ? JSON.parse(text) : [];
      return Response.json({ quotes: Array.isArray(data) ? data : [data] });
    }

    return Response.json({ error: 'Ação inválida. Use "search" ou "quote".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}