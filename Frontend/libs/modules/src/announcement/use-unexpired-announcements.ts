'use client';

import { useEffect, useState } from 'react';

export function useUnexpiredAnnouncements<
  T extends { expiresAt?: string | null },
>(announcements: readonly T[] | undefined): T[] {
  const [now, setNow] = useState(() => Date.now());
  const visible = (announcements ?? []).filter(
    ({ expiresAt }) => !expiresAt || Date.parse(expiresAt) > now,
  );
  const nextExpiry = visible.reduce(
    (soonest, { expiresAt }) =>
      expiresAt ? Math.min(soonest, Date.parse(expiresAt)) : soonest,
    Infinity,
  );

  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const delay = Math.min(Math.max(nextExpiry - Date.now(), 0), 2_147_483_647);
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [nextExpiry, now]);

  return visible;
}
