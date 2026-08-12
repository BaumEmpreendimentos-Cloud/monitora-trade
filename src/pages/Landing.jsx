import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LineChart, Crown, TrendingUp, Clock, BarChart3, ArrowRight } from 'lucide-react';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="border-b bg-card sticky top-0 z-10 pt-safe">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold">
            <LineChart className="w-5 h-5 text-primary" /> Monitora Trade
          </div>
          <nav className="flex gap-2 items-center">
            {isAuthenticated ? (
              <Link to="/operacoes"><Button size="sm">Ir para o app <ArrowRight className="w-4 h-4" /></Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
                <Link to="/register?returnTo=/operacoes"><Button size="sm">Criar conta</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium mb-6">
          <Clock className="w-3.5 h-3.5" /> 7 dias grátis para testar
        </div>
        <h1 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-4">
          Controle total das suas operações na B3
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
          Registre abertura e encerramento de operações, acompanhe cotações em tempo real
          e analise sua performance com cálculos automáticos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register?returnTo=/operacoes">
            <Button size="lg" className="w-full sm:w-auto">Começar grátis <ArrowRight className="w-4 h-4" /></Button>
          </Link>
          <Link to="/login?returnTo=/operacoes">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Já tenho conta</Button>
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: BarChart3, title: 'Controle de operações', desc: 'Organize operações por identificadores e acompanhe resultado e percentual.' },
          { icon: TrendingUp, title: 'Cotações em tempo real', desc: 'Acompanhe ações e opções da B3 com atualização automática.' },
          { icon: Clock, title: 'Histórico completo', desc: 'Revise todas as operações encerradas com datas e performance.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <div className="rounded-xl border bg-card p-8">
          <Crown className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h2 className="text-2xl font-heading font-bold mb-2">Plano Premium</h2>
          <p className="text-3xl font-heading font-bold mb-1">R$ 49,90<span className="text-base font-normal text-muted-foreground">/mês</span></p>
          <p className="text-sm text-muted-foreground mb-6">Após o período de 7 dias grátis.</p>
          <Link to="/register?returnTo=/operacoes">
            <Button size="lg">Iniciar teste gratuito</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Monitora Trade · Controle de operações financeiras
      </footer>
    </div>
  );
}