import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, X, Plus, RotateCcw, Loader2 } from 'lucide-react';
import { DEFAULT_CAROUSEL_TICKERS } from '@/lib/useCarouselCotacoes';

export default function CarouselTickersCard() {
  const { user, checkUserAuth } = useAuth();
  const [tickers, setTickers] = useState(user?.carousel_tickers?.length ? user.carousel_tickers : DEFAULT_CAROUSEL_TICKERS);
  const [newTicker, setNewTicker] = useState('');
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(tickers) !== JSON.stringify(user?.carousel_tickers?.length ? user.carousel_tickers : DEFAULT_CAROUSEL_TICKERS);

  const addTicker = () => {
    const t = newTicker.trim().toUpperCase();
    if (!t || tickers.includes(t)) return;
    setTickers([...tickers, t]);
    setNewTicker('');
  };

  const removeTicker = (t) => setTickers(tickers.filter((x) => x !== t));

  const resetDefault = () => setTickers(DEFAULT_CAROUSEL_TICKERS);

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ carousel_tickers: tickers });
      await checkUserAuth();
    } catch (e) {
      console.error('carousel_tickers save error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><LineChart className="w-5 h-5" /> Barra de Cotações</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Escolha os ativos exibidos na barra de cotações no topo da área logada.</p>
        <div className="flex flex-wrap gap-2">
          {tickers.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background text-xs font-mono font-bold">
              {t}
              <button onClick={() => removeTicker(t)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {!tickers.length && <span className="text-xs text-muted-foreground">Nenhum ticker. Adicione abaixo.</span>}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: PETR4"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTicker(); } }}
            className="max-w-[160px] uppercase"
            maxLength={8}
          />
          <Button size="sm" variant="secondary" onClick={addTicker} disabled={!newTicker.trim()}><Plus className="w-4 h-4" /> Adicionar</Button>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</> : 'Salvar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={resetDefault} disabled={saving}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar padrão</Button>
        </div>
      </CardContent>
    </Card>
  );
}