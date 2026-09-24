import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTour } from '@/lib/TourContext';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function GuidedTour() {
  const { active, currentStep, steps, next, prev, stopTour, finishTour } = useTour();
  const [rect, setRect] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!active || !steps.length) return;
    const step = steps[currentStep];
    if (!step) return;

    // Scroll to element on step change
    const el = document.querySelector(`[data-tour="${step.selector}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    // Poll for rect updates (handles scroll completion + dynamic content)
    const interval = setInterval(() => {
      const el2 = document.querySelector(`[data-tour="${step.selector}"]`);
      if (el2) {
        const r = el2.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [active, currentStep, steps]);

  if (!active || !steps.length || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const hasTarget = rect !== null;

  // Tooltip positioning for desktop
  let tooltipStyle = {};
  if (hasTarget && !isMobile) {
    const pad = 12;
    const tw = 320;
    const th = 200;
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - (rect.left + rect.width);

    if (spaceBelow > th + pad * 2) {
      tooltipStyle = { top: rect.top + rect.height + pad, left: Math.max(pad, Math.min(rect.left, window.innerWidth - tw - pad)), width: tw };
    } else if (spaceAbove > th + pad * 2) {
      tooltipStyle = { top: rect.top - th - pad, left: Math.max(pad, Math.min(rect.left, window.innerWidth - tw - pad)), width: tw };
    } else if (spaceRight > tw + pad * 2) {
      tooltipStyle = { top: Math.max(pad, rect.top), left: rect.left + rect.width + pad, width: tw };
    } else {
      tooltipStyle = { top: Math.max(pad, rect.top), left: Math.max(pad, rect.left - tw - pad), width: tw };
    }
  }

  const centeredStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 360 };

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Click blocker */}
      <div className="absolute inset-0" />

      {/* Dark overlay + highlight via box-shadow */}
      {hasTarget ? (
        <motion.div
          initial={false}
          animate={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute rounded-lg pointer-events-none"
          style={{
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 2px rgb(59 130 246), 0 0 24px rgba(59,130,246,0.5)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Tooltip */}
      {isMobile ? (
        <motion.div
          key={`tooltip-${currentStep}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 inset-x-0 bg-card border-t rounded-t-2xl shadow-2xl p-5 z-10"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Passo {currentStep + 1} de {steps.length}</span>
            <button onClick={stopTour} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
          </div>
          <h3 className="text-base font-bold mb-1">{step.titulo}</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.descricao}</p>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={stopTour}>Pular</Button>
            <div className="flex gap-2">
              {currentStep > 0 && <Button variant="ghost" size="sm" onClick={prev}><ChevronLeft className="w-4 h-4" /> Anterior</Button>}
              {isLast ? (
                <Button size="sm" onClick={finishTour}><Check className="w-4 h-4 mr-1" /> Finalizar</Button>
              ) : (
                <Button size="sm" onClick={next}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bg-card border rounded-xl shadow-2xl p-4 z-10"
            style={hasTarget ? tooltipStyle : centeredStyle}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Passo {currentStep + 1} de {steps.length}</span>
              <button onClick={stopTour} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="text-base font-bold mb-1">{step.titulo}</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.descricao}</p>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={stopTour}>Pular</Button>
              <div className="flex gap-2">
                {currentStep > 0 && <Button variant="ghost" size="sm" onClick={prev}><ChevronLeft className="w-4 h-4" /> Anterior</Button>}
                {isLast ? (
                  <Button size="sm" onClick={finishTour}><Check className="w-4 h-4 mr-1" /> Finalizar</Button>
                ) : (
                  <Button size="sm" onClick={next}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}