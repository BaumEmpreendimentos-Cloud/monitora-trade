import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, ArrowRight, Search, Layers, Sparkles, ChevronDown, ChevronUp, Lightbulb, Shield, Gauge } from 'lucide-react';
import { strategyTemplates } from '@/lib/strategyTemplates';

const difficultyColors = {
  'Iniciante': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Intermediário': 'text-amber-600 bg-amber-50 border-amber-200',
  'Avançado': 'text-orange-600 bg-orange-50 border-orange-200',
  'Profissional': 'text-red-600 bg-red-50 border-red-200',
};

export default function StrategyCatalog({ onSelectTemplate, spotPrice, ativoBase }) {
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredTemplates = strategyTemplates.filter((tpl) => {
    const matchesCategory =
      filterCategory === 'ALL' ||
      (filterCategory === 'BULLISH' && tpl.sentiment === 'BULLISH') ||
      (filterCategory === 'BEARISH' && tpl.sentiment === 'BEARISH') ||
      (filterCategory === 'NEUTRAL' && tpl.sentiment === 'NEUTRAL') ||
      (filterCategory === 'VOLATILITY' && tpl.sentiment === 'VOLATILITY');
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'BULLISH': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'BEARISH': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'NEUTRAL': return <Minus className="w-4 h-4 text-sky-500" />;
      case 'VOLATILITY': return <Activity className="w-4 h-4 text-amber-500" />;
      default: return <Sparkles className="w-4 h-4 text-emerald-500" />;
    }
  };

  const filterBtn = (cat, label, icon) => (
    <button
      type="button"
      onClick={() => setFilterCategory(cat)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
        filterCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent text-muted-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border bg-card">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Catálogo de Estruturas & Estratégias B3</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha uma estrutura clássica. Ao clicar em "Simular no Payoff", as pernas são escaladas e enviadas ao Simulador.
          </p>
        </div>
        {spotPrice != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ativo Base:</span>
            <span className="px-2.5 py-1 bg-muted border rounded-lg text-xs font-mono font-bold text-primary">
              {ativoBase || '—'} · R$ {spotPrice.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterBtn('ALL', `Todas (${strategyTemplates.length})`, null)}
          {filterBtn('BULLISH', 'Alta / Renda', <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />)}
          {filterBtn('BEARISH', 'Baixa', <TrendingDown className="w-3.5 h-3.5 text-red-500" />)}
          {filterBtn('NEUTRAL', 'Lateral / Neutra', <Minus className="w-3.5 h-3.5 text-sky-500" />)}
          {filterBtn('VOLATILITY', 'Volatilidade', <Activity className="w-3.5 h-3.5 text-amber-500" />)}
        </div>
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar estratégia..."
            className="w-full pl-9 pr-3 py-1.5 bg-background border rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const isExpanded = expandedId === template.id;
          const diffColor = difficultyColors[template.difficulty] || 'text-muted-foreground bg-muted border-border';
          return (
            <div
              key={template.id}
              className="p-4 rounded-xl border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg border bg-background">
                      {getSentimentIcon(template.sentiment)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm group-hover:text-primary transition">{template.name}</h3>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">{template.category}</span>
                    </div>
                  </div>
                  {template.difficulty && (
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${diffColor}`}>
                      {template.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[48px]">{template.description}</p>
                <div className="p-3 rounded-lg border bg-muted/50 space-y-1.5 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground font-medium">Lucro Máx:</span>
                    <span className="text-emerald-600 font-semibold text-right">{template.maxProfit}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground font-medium">Prejuízo Máx:</span>
                    <span className="text-red-600 font-semibold text-right">{template.maxLoss}</span>
                  </div>
                  {template.breakEvenDescription && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground font-medium">Break-Even:</span>
                      <span className="text-foreground font-medium text-right">{template.breakEvenDescription}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="flex items-center gap-3">
                      {template.idealIV && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Gauge className="w-3 h-3" /> IV: {template.idealIV}
                        </span>
                      )}
                      <span className="text-muted-foreground">Pernas: <span className="font-mono font-bold text-foreground">{template.legs.length}</span></span>
                    </div>
                  </div>
                </div>

                {isExpanded && template.detailedDescription && (
                  <div className="space-y-2.5 text-sm border-t pt-2">
                    <p className="text-muted-foreground leading-relaxed">{template.detailedDescription}</p>
                    {template.marginRequirementB3 && (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-blue-50 border border-blue-200">
                        <Shield className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                        <span className="text-blue-900 leading-relaxed">{template.marginRequirementB3}</span>
                      </div>
                    )}
                    {template.b3PracticalTips && template.b3PracticalTips.length > 0 && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                        <div className="flex items-center gap-1 text-amber-700 font-bold">
                          <Lightbulb className="w-3 h-3" /> Dicas Práticas B3
                        </div>
                        {template.b3PracticalTips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-1 text-amber-900 leading-relaxed pl-4">
                            <span className="text-amber-500">•</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 mt-2 space-y-2">
                {template.detailedDescription && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    className="w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition cursor-pointer"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="w-3 h-3" /> Ocultar detalhes</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> Ver detalhes e dicas</>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className="w-full py-2.5 px-4 rounded-xl bg-muted hover:bg-primary text-foreground hover:text-primary-foreground font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Simular no Payoff</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}