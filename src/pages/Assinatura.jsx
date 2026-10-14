import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isPremium, isGestor, trialDaysLeft } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, CheckCircle2, XCircle, Loader2, Clock, ShieldCheck, Users, Copy, Check, Ban, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Assinatura() {
  const { user, checkUserAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [indicacoes, setIndicacoes] = useState([]);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Indicacao.filter({ indicado_por_id: user.id })
      .then(setIndicacoes)
      .catch(() => {});
  }, [user?.id]);

  const refLink = user?.id ? `${window.location.origin}/register?ref=${user.id}` : '';
  const copyRefLink = () => {
    if (!refLink) return;
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const admin = isGestor(user);
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

  const handleCancel = async () => {
    setCancelLoading(true); setError('');
    try {
      await base44.functions.invoke('cancelSubscription', {});
      await checkUserAuth && checkUserAuth();
      setStatusMsg('Assinatura cancelada. Você manterá o acesso até o fim do período já pago.');
      setShowCancelConfirm(false);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setCancelLoading(false);
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
            {admin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-purple-600 font-semibold">
                  <ShieldCheck className="w-5 h-5" /> Gestor de Suporte
                </div>
                <p className="text-sm text-muted-foreground">Você é o Gestor de Suporte (proprietário). Tem acesso total ao sistema, sem cobrança de mensalidade.</p>
              </div>
            ) : premium ? (
              <div className="space-y-3">
                {user?.lifetime_access ? (
                  <div className="flex items-center gap-2 text-amber-600 font-semibold">
                    <Crown className="w-5 h-5" /> Acesso vitalício
                  </div>
                ) : user?.cancel_at_period_end ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-600 font-semibold">
                      <AlertTriangle className="w-5 h-5" /> Cancelamento agendado
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sua assinatura foi cancelada e permanecerá ativa até {periodEnd}.
                      Após essa data, o acesso Premium será encerrado.
                    </p>
                    <Button variant="outline" className="w-full" onClick={handleSubscribe} disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : <><Crown className="w-4 h-4 mr-2" /> Reativar assinatura</>}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-5 h-5" /> Assinatura ativa
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Você tem acesso aos dados premium.
                      {periodEnd && ` Renovação em ${periodEnd}.`}
                    </p>
                    <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => setShowCancelConfirm(true)}>
                      <Ban className="w-4 h-4 mr-2" /> Cancelar assinatura
                    </Button>
                  </>
                )}
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
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-heading font-bold">R$ 15,00<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                  </div>
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

        {showCancelConfirm && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertTriangle className="w-5 h-5" /> Confirmar cancelamento
              </div>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja cancelar sua assinatura? Você manterá o acesso Premium até o fim do período já pago ({periodEnd || 'data não disponível'}), após o que o acesso será encerrado.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)} disabled={cancelLoading}>
                  Manter assinatura
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={cancelLoading}>
                  {cancelLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelando...</> : 'Confirmar cancelamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.id && !admin && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-heading font-bold">Programa de Afiliados</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Indique amigos e ganhe <strong>1 mês grátis</strong> por cada assinatura ativa.
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Seu link de indicação</Label>
                <div className="flex gap-2">
                  <Input readOnly value={refLink} className="text-xs" />
                  <Button variant="outline" size="icon" onClick={copyRefLink} title="Copiar link">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {indicacoes.length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Indicações</p>
                    <p className="text-lg font-bold">{indicacoes.length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Convertidas</p>
                    <p className="text-lg font-bold text-emerald-600">{indicacoes.filter(i => i.status === 'convertido').length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-lg font-bold text-amber-600">{indicacoes.filter(i => i.status === 'pendente').length}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}