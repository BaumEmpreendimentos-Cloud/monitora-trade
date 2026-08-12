import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);

  const onTouchStart = useCallback((e) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      pullRef.current = 0;
      setPull(0);
      return;
    }
    const dampened = Math.min(delta * 0.4, THRESHOLD * 1.5);
    pullRef.current = dampened;
    setPull(dampened);
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
        pullRef.current = 0;
      }
    } else {
      setPull(0);
      pullRef.current = 0;
    }
  }, [onRefresh]);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {(pull > 0 || refreshing) && (
        <div className="md:hidden flex items-center justify-center overflow-hidden" style={{ height: `${pull}px` }}>
          <RefreshCw
            className={`w-5 h-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
            style={{
              opacity: Math.min(pull / THRESHOLD, 1),
              transform: `rotate(${pull * 3}deg) scale(${0.5 + Math.min(pull / THRESHOLD, 0.5)})`,
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}