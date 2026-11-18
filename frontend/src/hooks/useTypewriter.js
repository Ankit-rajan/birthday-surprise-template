import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Reveals `text` progressively while `active`. Shows everything at once for reduced-motion users. */
export function useTypewriter(text, active, { speed = 26, step = 2 } = {}) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return undefined;
    }
    if (reduce) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return Math.min(text.length, c + step);
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, active, reduce, speed, step]);

  return { shown: text.slice(0, count), done: count >= text.length, skip: () => setCount(text.length) };
}
