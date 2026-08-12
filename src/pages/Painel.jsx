import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Ban, CircleCheck, MessageSquare, Megaphone, Users, ShieldAlert } from 'lucide-react';
import { isPremium, isGestor, trialDaysLeft } from '@/lib/access';

const statusLabel = (u) => {
  if (u.blocked) return { text: 'Bloqueado', cls: 'bg-red-100 text-red-700' };
  if (isGestor(u)) return { text: 'Gestor', cls: 'bg-purple-100 text-purple-700' };
  if (isPremium(u)) return { text: 'Premium', cls: 'bg-emerald-100 text-emerald-700' };
  const left = trialDaysLeft(u);
  if (left === null) return { text: 'Sem trial', cls: 'bg-muted' };
  if (left > 0) return { text: `Trial: ${left}d`, cls: 'bg-amber-100 text-amber-700' };
  return { text: 'Trial expirado', cls: 'bg-red-100 text-red-700' };
};

export default function Painel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.User.list();
      setUsers(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('load users', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!isGestor(user)) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <ShieldAlert className="w-8 h-8" /> Acesso restrito ao Gestor de Suporte.
      </div>
    );
  }

  const toggleBlock = async (u) => {
    try {
      await base44.entities.User.update(u.id, { blocked: !u.blocked });
      load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const counts = {
    total: users.length,
    premium: users.filter((u) => isPremium(u) && !isGestor(u)).length,
    trial: users.filter((u) => !isGestor(u) && !isPremium(u) && trialDaysLeft(u) > 0).length,
    expired: users.filter((u) => !isGestor(u) && !isPremium(u) && u.trial_start && trialDaysLeft(u) <= 0).length,
    blocked: users.filter((u) => u.blocked).length,
  };

  const stats = [
    { icon: Users, label: 'Usuários', value: counts.total },
    { icon: CircleCheck, label: 'Premium', value: counts.premium },
    { icon: Megaphone, label: 'Em trial', value: counts.trial },
    { icon: ShieldAlert, label: 'Bloqueados', value: counts.blocked },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Painel do Gestor</h1>
            <p className="text-sm text-muted-foreground">Usuários cadastrados e assinaturas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/mensagens?para=ALL')}>
              <Megaphone className="w-4 h-4 mr-1" /> Avisar todos
            </Button>
            <Button size="sm" onClick={() => navigate('/mensagens')}>
              <MessageSquare className="w-4 h-4 mr-1" /> Mensagens
            </Button>
          </div>
        </div>

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
              <p className="p-6 text-sm text-muted-foreground text-center">Carregando usuários...</p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => {
                  const st = statusLabel(u);
                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{u.email}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {u.current_period_end ? `Renovação: ${new Date(u.current_period_end).toLocaleDateString('pt-BR')}` : '—'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/mensagens?para=${u.id}`)}>
                          <MessageSquare className="w-4 h-4 mr-1" /> Mensagem
                        </Button>
                        <Button
                          variant={u.blocked ? 'outline' : 'destructive'}
                          size="sm"
                          onClick={() => toggleBlock(u)}
                        >
                          <Ban className="w-4 h-4 mr-1" /> {u.blocked ? 'Desbloquear' : 'Bloquear'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!loading && users.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">Nenhum usuário cadastrado.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}