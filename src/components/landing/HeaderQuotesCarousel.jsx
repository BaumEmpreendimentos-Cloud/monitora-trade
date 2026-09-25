import React from 'react';
import { usePerspectivaMercado } from '@/lib/usePerspectivaMercado';
import QuotesCarousel from '@/components/landing/QuotesCarousel';

export default function HeaderQuotesCarousel() {
  const { perspectiva } = usePerspectivaMercado();
  if (!perspectiva?.cotacoes?.length) return null;
  return <QuotesCarousel cotacoes={perspectiva.cotacoes} />;
}