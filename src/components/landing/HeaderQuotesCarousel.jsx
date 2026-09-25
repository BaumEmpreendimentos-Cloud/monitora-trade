import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useCarouselCotacoes, DEFAULT_CAROUSEL_TICKERS } from '@/lib/useCarouselCotacoes';
import QuotesCarousel from '@/components/landing/QuotesCarousel';

export default function HeaderQuotesCarousel() {
  const { user } = useAuth();
  const tickers = user?.carousel_tickers?.length ? user.carousel_tickers : DEFAULT_CAROUSEL_TICKERS;
  const cotacoes = useCarouselCotacoes(tickers);
  if (!cotacoes.length) return null;
  return <QuotesCarousel cotacoes={cotacoes} />;
}