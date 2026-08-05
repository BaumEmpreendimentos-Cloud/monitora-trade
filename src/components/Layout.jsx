import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LineChart, Crown } from 'lucide-react';

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-md text-sm ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`;

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold">
            <LineChart className="w-5 h-5 text-primary" /> Monitora Trade
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={linkClass}>Operações</NavLink>
            <NavLink to="/historico" className={linkClass}>Histórico</NavLink>
            <NavLink to="/cotacoes" className={linkClass}>Cotações</NavLink>
            <NavLink to="/assinatura" className={linkClass}><Crown className="w-4 h-4 inline -mt-0.5" /> Premium</NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}