import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { tourStepsOperacoes, tourStepsOpcoes } from '@/lib/tourSteps';

const TourContext = createContext(null);
const STORAGE_KEY = 'monitora_tour_visto';

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [screen, setScreen] = useState(null);
  const location = useLocation();

  const getSeen = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  };

  const markSeen = (scr) => {
    const seen = getSeen();
    seen[scr] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  };

  const startTour = (scr) => {
    const tourSteps = scr === 'operacoes' ? tourStepsOperacoes : tourStepsOpcoes;
    setSteps(tourSteps);
    setScreen(scr);
    setCurrentStep(0);
    setActive(true);
  };

  const stopTour = () => {
    setActive(false);
    setSteps([]);
    setCurrentStep(0);
    setScreen(null);
  };

  const next = () => {
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const prev = () => setCurrentStep((s) => Math.max(0, s - 1));

  const finishTour = () => {
    if (screen) markSeen(screen);
    stopTour();
  };

  // Auto-start on first visit
  useEffect(() => {
    if (active) return;
    const seen = getSeen();
    if (location.pathname === '/operacoes' && !seen.operacoes) {
      const t = setTimeout(() => startTour('operacoes'), 1000);
      return () => clearTimeout(t);
    }
    if (location.pathname === '/opcoes' && !seen.opcoes && seen.operacoes) {
      const t = setTimeout(() => startTour('opcoes'), 1000);
      return () => clearTimeout(t);
    }
  }, [location.pathname, active]);

  return (
    <TourContext.Provider value={{ active, currentStep, steps, screen, next, prev, stopTour, finishTour, startTour }}>
      {children}
    </TourContext.Provider>
  );
}