import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
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
  const { user } = useAuth();
  const persistingRef = useRef(false);

  // Server (user profile) is the source of truth; localStorage is a fallback
  // for the current session before the profile loads.
  const getSeen = () => {
    const local = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } })();
    const remote = (user && user.tour_visto) || {};
    return { ...local, ...remote };
  };

  const markSeen = async (scr) => {
    // Optimistically update localStorage so the UI reacts immediately.
    const local = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } })();
    local[scr] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));

    // Persist to the user profile so it survives logout and other devices.
    if (user && !persistingRef.current) {
      persistingRef.current = true;
      try {
        const remote = (user.tour_visto) || {};
        await base44.auth.updateMe({ tour_visto: { ...remote, [scr]: true } });
      } catch (e) {
        // Silent: localStorage already keeps this session consistent.
      } finally {
        persistingRef.current = false;
      }
    }
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

  // Auto-start on first visit (per user, across devices)
  useEffect(() => {
    if (active) return;
    // Wait until the user profile has loaded so we don't re-trigger a tour
    // the user already completed on another device/session.
    if (!user) return;
    const seen = getSeen();
    if (location.pathname === '/operacoes' && !seen.operacoes) {
      const t = setTimeout(() => startTour('operacoes'), 1000);
      return () => clearTimeout(t);
    }
    if (location.pathname === '/opcoes' && !seen.opcoes && seen.operacoes) {
      const t = setTimeout(() => startTour('opcoes'), 1000);
      return () => clearTimeout(t);
    }
  }, [location.pathname, active, user]);

  return (
    <TourContext.Provider value={{ active, currentStep, steps, screen, next, prev, stopTour, finishTour, startTour }}>
      {children}
    </TourContext.Provider>
  );
}