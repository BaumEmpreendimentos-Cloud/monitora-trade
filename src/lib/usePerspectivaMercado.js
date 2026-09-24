import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function usePerspectivaMercado() {
  const [perspectiva, setPerspectiva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.PerspectivaMercado.list('-gerado_em', 1);
        setPerspectiva(list?.[0] || null);
      } catch (e) { /* indisponível */ }
      finally { setLoading(false); }
    })();
  }, []);

  return { perspectiva, loading };
}