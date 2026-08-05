import React, { useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { LineChart, Crown, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { hasAccess, isPremium, trialDaysLeft } from '@/lib/access';

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-md text-sm ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`;

export default function Layout() {
  const { user, checkUserAuth, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user && !user.trial_start) {
      base44.auth.updateMe({ trial_start: new Date().toISOString() })
        .then(() => checkUserAuth && checkUserAuth())
        .catch((e) => console.error('trial_start error', e));
    }
  }, [user, checkUserAuth]);

  if (user && !hasAccess(user) && location.pathname !== '/assinatura') {
    return <Navigate to="/assinatura" replace />;
  }

  const daysLeft = user ? trialDaysLeft(user) : null;
  const premium = isPremium(user);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold">
            <LineChart className="w-5 h-5 text-primary" /> Monitora Trade
          </div>
          <nav className="flex gap-1 items-center">
            <NavLink to="/operacoes" className={linkClass}>Operações</NavLink>
            <NavLink to="/historico" className={linkClass}>Histórico</NavLink>
            <NavLink to="/cotacoes" className={linkClass}>Cotações</NavLink>
            <NavLink to="/assinatura" className={linkClass}><Crown className="w-4 h-4 inline -mt-0.5" /> Premium</NavLink>
            <button onClick={() => logout()} className="px-2 py-1.5 rounded-md text-sm hover:bg-accent text-muted-foreground inline-flex items-center">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>
      {!premium && daysLeft !== null && daysLeft > 0 && (
        <div className="bg-amber-50 text-amber-800 text-xs text-center py-1.5 px-2">
          Período grátis: restam {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}.{' '}
          <NavLink to="/assinatura" className="underline font-medium">Assine agora</NavLink>
        </div>
      )}
      <Outlet />
    </div>
  );
}