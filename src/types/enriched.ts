import type { Abwesenheiten, Leistungsbeurteilungen, Mitarbeitende, Stellen } from './app';

export type EnrichedStellen = Stellen & {
  abteilungName: string;
};

export type EnrichedMitarbeitende = Mitarbeitende & {
  abteilungName: string;
  stelleName: string;
};

export type EnrichedAbwesenheiten = Abwesenheiten & {
  mitarbeiterName: string;
};

export type EnrichedLeistungsbeurteilungen = Leistungsbeurteilungen & {
  mitarbeiterName: string;
};
