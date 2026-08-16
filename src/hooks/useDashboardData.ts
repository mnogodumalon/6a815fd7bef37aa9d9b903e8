import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Abteilungen, Stellen, Mitarbeitende, Abwesenheiten, Leistungsbeurteilungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { t } from '@/i18n';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [abteilungen, setAbteilungen] = useState<Abteilungen[]>([]);
  const [stellen, setStellen] = useState<Stellen[]>([]);
  const [mitarbeitende, setMitarbeitende] = useState<Mitarbeitende[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<Abwesenheiten[]>([]);
  const [leistungsbeurteilungen, setLeistungsbeurteilungen] = useState<Leistungsbeurteilungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [abteilungenData, stellenData, mitarbeitendeData, abwesenheitenData, leistungsbeurteilungenData] = await Promise.all([
        LivingAppsService.getAbteilungen(),
        LivingAppsService.getStellen(),
        LivingAppsService.getMitarbeitende(),
        LivingAppsService.getAbwesenheiten(),
        LivingAppsService.getLeistungsbeurteilungen(),
      ]);
      setAbteilungen(abteilungenData);
      setStellen(stellenData);
      setMitarbeitende(mitarbeitendeData);
      setAbwesenheiten(abwesenheitenData);
      setLeistungsbeurteilungen(leistungsbeurteilungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('data_load_failed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [abteilungenData, stellenData, mitarbeitendeData, abwesenheitenData, leistungsbeurteilungenData] = await Promise.all([
          LivingAppsService.getAbteilungen(),
          LivingAppsService.getStellen(),
          LivingAppsService.getMitarbeitende(),
          LivingAppsService.getAbwesenheiten(),
          LivingAppsService.getLeistungsbeurteilungen(),
        ]);
        setAbteilungen(abteilungenData);
        setStellen(stellenData);
        setMitarbeitende(mitarbeitendeData);
        setAbwesenheiten(abwesenheitenData);
        setLeistungsbeurteilungen(leistungsbeurteilungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const abteilungenMap = useMemo(() => {
    const m = new Map<string, Abteilungen>();
    abteilungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [abteilungen]);

  const stellenMap = useMemo(() => {
    const m = new Map<string, Stellen>();
    stellen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [stellen]);

  const mitarbeitendeMap = useMemo(() => {
    const m = new Map<string, Mitarbeitende>();
    mitarbeitende.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeitende]);

  return { abteilungen, setAbteilungen, stellen, setStellen, mitarbeitende, setMitarbeitende, abwesenheiten, setAbwesenheiten, leistungsbeurteilungen, setLeistungsbeurteilungen, loading, error, fetchAll, abteilungenMap, stellenMap, mitarbeitendeMap };
}