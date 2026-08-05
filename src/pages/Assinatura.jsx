import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isPremium, trialDaysLeft } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

export default function Assinatura() {
  const { user, checkUserAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get('status');
    if (st === 'success') {
      setStatusMsg('Pagamento aprovado! Ativando seu plano Premium...');
      checkUserAuth && checkUserAuth();
    } else if (st === 'canceled') {
      setStatusMsg('Assinatura cancelada. Você pode tentar novamente quando quiser.');
    }
  }, [checkUserAuth]);

  const premium = isPremium(user);
  const daysLeft = trialDaysLeft(user);
  const trialEnded = user?.trial_start && daysLeft !== null && daysLeft <= 0;

  const handleSubscribe = async () => {
    if (window.self !== window.top) {
      alert('O checkout só funciona no app publicado, não no editor.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('createCheckout', { origin: window.location.origin });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Não foi possível iniciar o checkout.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const periodEnd = user?.current_period_end ? new Date(user.current_period_end).toLocaleDateString('pt-BR') : null;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" /> Plano Premium
          </h1>
          <p className="text-sm text-muted-foreground">Acesso completo aos dados premium de mercado.</p>
        </div>

        {statusMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${statusMsg.includes('aprovado') ? 'bg-emerald-50 text-emerald-700' : 'bg-muted'}`}>
            {statusMsg.includes('aprovado') ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {statusMsg}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="p-6 space-y-4">
            {premium ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-5 h-5" /> Assinatura ativa
                </div>
                <p className="text-sm text-muted-foreground">
                  Você tem acesso aos dados premium.
                  {periodEnd && ` Renovação em ${periodEnd}.`}
                </p>
              </div>
            ) : (
              <>
                {daysLeft !== null && daysLeft > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 text-amber-800 text-sm">
                    <Clock className="w-4 h-4" /> Você está no período grátis: restam {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}.
                  </div>
                )}
                {trialEnded && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <XCircle className="w-4 h-4" /> Seu período grátis acabou. Assine para continuar usando.
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-3xl font-heading font-bold">R$ 49,90<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                  <ul className="text-sm space-y-1.5 text-muted-foreground">
                    <li>• Cotações em tempo real da B3</li>
                    <li>• Histórico avançado de operações</li>
                    <li>• Acompanhamento ilimitado de ativos</li>
                  </ul>
                </div>
                <Button size="lg" className="w-full" onClick={handleSubscribe} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando...</> : <><Crown className="w-4 h-4 mr-2" /> Assinar Premium</>}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Cobrança mensal recorrente. Cancele quando quiser.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}