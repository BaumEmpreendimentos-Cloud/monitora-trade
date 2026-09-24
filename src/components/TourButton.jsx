import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useTour } from '@/lib/TourContext';

export default function TourButton({ className = '' }) {
  const { startTour, active } = useTour();
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = () => {
    if (active) return;
    const onTourPage = location.pathname === '/operacoes' || location.pathname === '/opcoes';
    if (!onTourPage) {
      navigate('/operacoes');
      setTimeout(() => startTour('operacoes'), 600);
    } else {
      startTour(location.pathname === '/opcoes' ? 'opcoes' : 'operacoes');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={active}
      className={`${className} ${active ? 'opacity-50 pointer-events-none' : ''}`}
      title="Tour guiado"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}