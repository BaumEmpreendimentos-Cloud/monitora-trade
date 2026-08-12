import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, User, Crown, Calendar } from 'lucide-react';
import { isPremium, isGestor, trialDaysLeft } from '@/lib/access';

export default function Configuracoes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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
      <div className="max-w-2xl mx-auto space-y-6">
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
          </CardContent>
        </Card>

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