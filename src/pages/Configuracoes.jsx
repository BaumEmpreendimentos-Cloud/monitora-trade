import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, User, Crown, Calendar, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { isPremium, isGestor, trialDaysLeft } from '@/lib/access';
import CarouselTickersCard from '@/components/config/CarouselTickersCard';

export default function Configuracoes() {
  const { user, checkUserAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [savingCpf, setSavingCpf] = useState(false);

  const handleSaveCpf = async () => {
    setSavingCpf(true);
    try {
      await base44.auth.updateMe({ cpf });
      await checkUserAuth();
    } catch (e) {
      console.error('cpf save error', e);
    } finally {
      setSavingCpf(false);
    }
  };

  const handleNotifToggle = async (field, value) => {
    setSavingNotif(true);
    try {
      await base44.auth.updateMe({ [field]: value });
    } catch (e) {
      console.error('notif save error', e);
    } finally {
      setSavingNotif(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      try {
        await base44.entities.User.delete(user.id);
      } catch (e) {
        console.error('delete error', e);
      }
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e.message || 'Erro ao excluir conta.');
    } finally {
      setDeleting(false);
    }
  };

  const planLabel = isGestor(user) ? 'Gestor' : isPremium(user) ? 'Premium' : (trialDaysLeft(user) > 0 ? `Trial (${trialDaysLeft(user)} dias)` : 'Trial expirado');

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Configurações</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Conta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-medium flex items-center gap-1">
                {isPremium(user) || isGestor(user) ? <Crown className="w-4 h-4 text-amber-500" /> : <Calendar className="w-4 h-4" />}
                {planLabel}
              </p>
            </div>
            <div className="space-y-1.5 pt-3 border-t">
              <Label htmlFor="cpf" className="text-xs text-muted-foreground">CPF</Label>
              <div className="flex gap-2">
                <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} className="max-w-[200px]" />
                <Button size="sm" variant="secondary" onClick={handleSaveCpf} disabled={savingCpf || cpf === (user?.cpf || '')}>{savingCpf ? 'Salvando...' : 'Salvar'}</Button>
              </div>
              <p className="text-xs text-muted-foreground">Utilizado na geração da DARF do Imposto de Renda.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notificações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Escolha os canais onde deseja receber os alertas. Todos estão habilitados por padrão.</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Push (Celular)</p>
                <p className="text-xs text-muted-foreground">Notificações nativas no iOS e Android</p>
              </div>
              <Switch
                checked={user?.notif_push !== false}
                disabled={savingNotif}
                onCheckedChange={(v) => handleNotifToggle('notif_push', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">E-mail</p>
                <p className="text-xs text-muted-foreground">Receber alertas no seu e-mail cadastrado</p>
              </div>
              <Switch
                checked={user?.notif_email !== false}
                disabled={savingNotif}
                onCheckedChange={(v) => handleNotifToggle('notif_email', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">No App</p>
                <p className="text-xs text-muted-foreground">Mensagens internas na aba Mensagens</p>
              </div>
              <Switch
                checked={user?.notif_inapp !== false}
                disabled={savingNotif}
                onCheckedChange={(v) => handleNotifToggle('notif_inapp', v)}
              />
            </div>
          </CardContent>
        </Card>

        <CarouselTickersCard />

        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Zona de Perigo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">A exclusão da conta é permanente. Todos os seus dados (operações, histórico, dividendos) serão removidos.</p>
            <Button variant="destructive" onClick={() => setShowDelete(true)} className="min-h-[44px]">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Conta
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Excluir conta?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão perdidos.</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir permanentemente'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}