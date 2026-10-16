import { useEffect, useRef, useState } from 'react';

// Animates a number from its previous value to `to` (ease-out, ~800 ms).
export function useCountUp(to: number, ms = 800) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const a = from.current, t0 = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      setV(Math.round(a + (to - a) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}
