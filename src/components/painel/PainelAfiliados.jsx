import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, UserCheck, Clock, Gift, Users2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

export default function PainelAfiliados() {
  const { toast } = useToast();
  const [indicacoes, setIndicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVals, setEditVals] = useState({});
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Indicacao.list('-created_date', 500);
      setIndicacoes(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('load indicacoes', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = {};
    indicacoes.forEach((ind) => {
      const key = ind.indicado_por_id;
      if (!map[key]) {
        map[key] = {
          referrerId: key,
          referrerEmail: ind.indicado_por_email || '—',
          items: [],
        };
      }
      map[key].items.push(ind);
    });
    return Object.values(map);
  }, [indicacoes]);

  const counts = useMemo(() => {
    const total = indicacoes.length;
    const converted = indicacoes.filter((i) => i.status === 'convertido').length;
    const pending = indicacoes.filter((i) => i.status === 'pendente').length;
    const rewarded = indicacoes.filter((i) => i.recompensa_aplicada).length;
    return { referrers: grouped.length, total, converted, pending, rewarded };
  }, [indicacoes, grouped]);

  const stats = [
    { icon: Users2, label: 'Indicadores', value: counts.referrers },
    { icon: UserCheck, label: 'Convertidas', value: counts.converted },
    { icon: Clock, label: 'Pendentes', value: counts.pending },
    { icon: Gift, label: 'Recompensas', value: counts.rewarded },
  ];

  const getBeneficio = (group) => {
    const val = editVals[group.referrerId];
    if (val !== undefined) return val;
    return group.items[0]?.beneficio_dias ?? 30;
  };

  const handleSave = async (group) => {
    const val = editVals[group.referrerId];
    if (val === undefined) return;
    setSaving(group.referrerId);
    try {
      const updates = group.items.map((i) => ({ id: i.id, beneficio_dias: Number(val) }));
      await base44.entities.Indicacao.bulkUpdate(updates);
      setIndicacoes((prev) => prev.map((i) =>
        i.indicado_por_id === group.referrerId ? { ...i, beneficio_dias: Number(val) } : i
      ));
      setEditVals((p) => { const c = { ...p }; delete c[group.referrerId]; return c; });
      toast({ title: 'Benefício atualizado', description: `${group.referrerEmail}: ${val} dias` });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setSaving(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-heading font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Carregando indicações...</p>
          ) : grouped.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma indicação registrada.</p>
          ) : (
            <div className="divide-y divide-border">
              {grouped.map((group) => {
                const isOpen = expanded[group.referrerId];
                const convertedCount = group.items.filter((i) => i.status === 'convertido').length;
                const currentBeneficio = group.items[0]?.beneficio_dias ?? 30;
                const editing = editVals[group.referrerId] !== undefined;
                const val = getBeneficio(group);
                return (
                  <div key={group.referrerId} className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setExpanded((p) => ({ ...p, [group.referrerId]: !p[group.referrerId] }))}
                        >
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{group.referrerEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.items.length} indicação(ões) • {convertedCount} convertida(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min={1}
                            className="w-20 h-8"
                            value={val}
                            onChange={(e) => setEditVals((p) => ({ ...p, [group.referrerId]: e.target.value }))}
                          />
                          <span className="text-xs text-muted-foreground">dias</span>
                        </div>
                        <Button
                          size="sm"
                          variant={editing ? 'default' : 'outline'}
                          disabled={!editing || saving === group.referrerId}
                          onClick={() => handleSave(group)}
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          {saving === group.referrerId ? '...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                    {!editing && (
                      <p className="text-xs text-muted-foreground mt-1 lg:mt-0 lg:absolute lg:right-0">
                        Atual: <b className="text-foreground">{currentBeneficio}</b> dias
                      </p>
                    )}
                    {isOpen && (
                      <div className="mt-3 ml-2 space-y-1.5">
                        {group.items.map((ind) => (
                          <div key={ind.id} className="flex items-center justify-between gap-2 text-sm bg-muted/40 rounded px-3 py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{ind.user_email || ind.user_id}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${ind.status === 'convertido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {ind.status}
                              </span>
                              {ind.recompensa_aplicada && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">pago</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {fmtDate(ind.data_indicacao)} {ind.data_conversao ? `→ ${fmtDate(ind.data_conversao)}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}