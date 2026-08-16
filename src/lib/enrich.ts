import type { EnrichedAbwesenheiten, EnrichedLeistungsbeurteilungen, EnrichedMitarbeitende, EnrichedStellen } from '@/types/enriched';
import type { Abteilungen, Abwesenheiten, Leistungsbeurteilungen, Mitarbeitende, Stellen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface StellenMaps {
  abteilungenMap: Map<string, Abteilungen>;
}

export function enrichStellen(
  stellen: Stellen[],
  maps: StellenMaps
): EnrichedStellen[] {
  return stellen.map(r => ({
    ...r,
    abteilungName: resolveDisplay(r.fields.abteilung, maps.abteilungenMap, 'abteilungsname'),
  }));
}

interface MitarbeitendeMaps {
  abteilungenMap: Map<string, Abteilungen>;
  stellenMap: Map<string, Stellen>;
}

export function enrichMitarbeitende(
  mitarbeitende: Mitarbeitende[],
  maps: MitarbeitendeMaps
): EnrichedMitarbeitende[] {
  return mitarbeitende.map(r => ({
    ...r,
    abteilungName: resolveDisplay(r.fields.abteilung, maps.abteilungenMap, 'abteilungsname'),
    stelleName: resolveDisplay(r.fields.stelle, maps.stellenMap, 'stellenbezeichnung'),
  }));
}

interface AbwesenheitenMaps {
  mitarbeitendeMap: Map<string, Mitarbeitende>;
}

export function enrichAbwesenheiten(
  abwesenheiten: Abwesenheiten[],
  maps: AbwesenheitenMaps
): EnrichedAbwesenheiten[] {
  return abwesenheiten.map(r => ({
    ...r,
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeitendeMap, 'vorname', 'nachname'),
  }));
}

interface LeistungsbeurteilungenMaps {
  mitarbeitendeMap: Map<string, Mitarbeitende>;
}

export function enrichLeistungsbeurteilungen(
  leistungsbeurteilungen: Leistungsbeurteilungen[],
  maps: LeistungsbeurteilungenMaps
): EnrichedLeistungsbeurteilungen[] {
  return leistungsbeurteilungen.map(r => ({
    ...r,
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeitendeMap, 'vorname', 'nachname'),
  }));
}
