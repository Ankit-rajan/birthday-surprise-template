import { useEffect, useMemo, useState } from 'react';

/**
 * Countdown to the next occurrence of the birthday, in the viewer's local time.
 * `age` is the age reached on this calendar year's birthday (e.g. 26 for a 2000-11-19 birthday in 2026).
 */
function compute(birthDate, now) {
  const [birthYear, month, day] = (birthDate || '2000-01-01').split('-').map(Number);
  const year = now.getFullYear();
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  const isToday = now >= start && now < end;
  const target = now >= end ? new Date(year + 1, month - 1, day) : start;
  const diff = Math.max(0, target.getTime() - now.getTime());

  const seconds = Math.floor(diff / 1000);
  return {
    isToday,
    age: year - birthYear,
    upcomingAge: target.getFullYear() - birthYear,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export function useBirthday(birthDate) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => compute(birthDate, now), [birthDate, now]);
}
