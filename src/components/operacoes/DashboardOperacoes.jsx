import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, XAxis } from 'recharts';
import { Activity, TrendingUp, CalendarDays, Target } from 'lucide-react';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

function Metric({ icon: Icon, label, value, valueClass = '' }) {
  return (
    <div className="bg-card p-3 flex flex-col items-center text-center gap-1">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function DashboardOperacoes({ openOps, closedOps, totalDia }) {
  const chartData = useMemo(() => {
    const sorted = [...closedOps]
      .filter((o) => o.data_fechamento)
      .sort((a, b) => new Date(a.data_fechamento) - new Date(b.data_fechamento));
    let cum = 0;
    return sorted.map((o, i) => {
      cum += o.resultado_valor || 0;
      return {
        label: new Date(o.data_fechamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        resultado: cum,
      };
    });
  }, [closedOps]);

  const donutData = useMemo(() => {
    let lucro = 0, prejuizo = 0, neutro = 0;
    closedOps.forEach((o) => {
      const v = o.resultado_valor || 0;
      if (v > 0) lucro++;
      else if (v < 0) prejuizo++;
      else neutro++;
    });
    return [
      { name: 'Lucro', value: lucro, color: '#4caf50' },
      { name: 'Prejuízo', value: prejuizo, color: '#e53935' },
      { name: 'Neutro', value: neutro, color: '#9e9e9e' },
    ].filter((d) => d.value > 0);
  }, [closedOps]);

  const totalDonut = donutData.reduce((s, d) => s + d.value, 0) || 1;
  const cumResultado = chartData.length ? chartData[chartData.length - 1].resultado : 0;

  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();
  const totalMes = useMemo(() => closedOps
    .filter((o) => {
      if (!o.data_fechamento) return false;
      const d = new Date(o.data_fechamento);
      return d.getMonth() === mes && d.getFullYear() === ano;
    })
    .reduce((s, o) => s + (o.resultado_valor || 0), 0), [closedOps, mes, ano]);

  const taxaAcerto = closedOps.length
    ? (closedOps.filter((o) => (o.resultado_valor || 0) > 0).length / closedOps.length) * 100
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Evolução de Resultados</span>
              <span className="text-xs text-muted-foreground">{closedOps.length} op.</span>
            </div>
            <p className={`text-2xl font-bold mb-2 ${color(cumResultado)}`}>R$ {fmt(cumResultado)}</p>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradResultado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cumResultado >= 0 ? '#4caf50' : '#e53935'} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={cumResultado >= 0 ? '#4caf50' : '#e53935'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <Tooltip
                    formatter={(v) => [`R$ ${fmt(v)}`, 'Resultado']}
                    contentStyle={tooltipStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="resultado"
                    stroke={cumResultado >= 0 ? '#4caf50' : '#e53935'}
                    strokeWidth={2}
                    fill="url(#gradResultado)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Encerre operações para ver a evolução</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground mb-2 block">Distribuição de Resultados</span>
            {donutData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={32} outerRadius={48} paddingAngle={2}>
                      {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} operações`, '']} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-sm">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{Math.round((d.value / totalDonut) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Sem operações encerradas</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
        <Metric icon={Activity} label="Operações Abertas" value={String(openOps.length)} />
        <Metric icon={TrendingUp} label="Resultado do Dia" value={`R$ ${fmt(totalDia)}`} valueClass={color(totalDia)} />
        <Metric icon={CalendarDays} label="Resultado do Mês" value={`R$ ${fmt(totalMes)}`} valueClass={color(totalMes)} />
        <Metric icon={Target} label="Taxa de Acerto" value={`${fmt(taxaAcerto)}%`} valueClass={color(taxaAcerto)} />
      </div>
    </div>
  );
}