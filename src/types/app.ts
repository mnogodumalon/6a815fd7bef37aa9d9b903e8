import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Abteilungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    abteilungsname?: string;
    abteilungscode?: string;
    beschreibung?: string;
    leiter_vorname?: string;
    leiter_nachname?: string;
    standort?: string;
    kostenstelle?: string;
  };
}

export interface Stellen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    stellenbezeichnung?: string;
    stellencode?: string;
    abteilung?: string; // applookup -> URL zu 'Abteilungen' Record
    beschaeftigungsart?: LookupValue;
    senioritaet?: LookupValue;
    aufgaben?: string;
    qualifikationen?: string;
  };
}

export interface Mitarbeitende {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    postleitzahl?: string;
    ort?: string;
    personalnummer?: string;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    beschaeftigungsart?: LookupValue;
    abteilung?: string; // applookup -> URL zu 'Abteilungen' Record
    stelle?: string; // applookup -> URL zu 'Stellen' Record
    notfall_vorname?: string;
    notfall_nachname?: string;
    notfall_telefon?: string;
    iban?: string;
    notizen?: string;
    profilbild?: string;
    vorname?: string;
    nachname?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geschlecht?: LookupValue;
    nationalitaet?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
  };
}

export interface Abwesenheiten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeitende' Record
    abwesenheitstyp?: LookupValue;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    anzahl_tage?: number;
    grund?: string;
    status?: LookupValue;
    genehmigt_von?: string;
  };
}

export interface Leistungsbeurteilungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeitende' Record
    beurteilungszeitraum?: LookupValue;
    beurteilungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    beurteiler_vorname?: string;
    beurteiler_nachname?: string;
    gesamtbewertung?: LookupValue;
    ziele_erreicht?: string;
    staerken?: string;
    verbesserungsbereiche?: string;
    entwicklungsplan?: string;
    mitarbeiter_kommentar?: string;
  };
}

export const APP_IDS = {
  ABTEILUNGEN: '6a815fb6edb1e94257dec881',
  STELLEN: '6a815fbc8282bba92d3d389d',
  MITARBEITENDE: '6a815fbd1c209a5a536f3810',
  ABWESENHEITEN: '6a815fbe0a649075e531b849',
  LEISTUNGSBEURTEILUNGEN: '6a815fbf84a58545b70168a7',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'stellen': {
    beschaeftigungsart: [{ key: "vollzeit", get label() { return lookupLabel('stellen', 'beschaeftigungsart', "vollzeit") ?? "Vollzeit"; } }, { key: "teilzeit", get label() { return lookupLabel('stellen', 'beschaeftigungsart', "teilzeit") ?? "Teilzeit"; } }, { key: "minijob", get label() { return lookupLabel('stellen', 'beschaeftigungsart', "minijob") ?? "Minijob"; } }, { key: "praktikum", get label() { return lookupLabel('stellen', 'beschaeftigungsart', "praktikum") ?? "Praktikum"; } }, { key: "werkstudent", get label() { return lookupLabel('stellen', 'beschaeftigungsart', "werkstudent") ?? "Werkstudent"; } }],
    senioritaet: [{ key: "junior", get label() { return lookupLabel('stellen', 'senioritaet', "junior") ?? "Junior"; } }, { key: "mid_level", get label() { return lookupLabel('stellen', 'senioritaet', "mid_level") ?? "Mid-Level"; } }, { key: "senior", get label() { return lookupLabel('stellen', 'senioritaet', "senior") ?? "Senior"; } }, { key: "lead", get label() { return lookupLabel('stellen', 'senioritaet', "lead") ?? "Lead"; } }, { key: "manager", get label() { return lookupLabel('stellen', 'senioritaet', "manager") ?? "Manager"; } }],
  },
  'mitarbeitende': {
    beschaeftigungsart: [{ key: "vollzeit", get label() { return lookupLabel('mitarbeitende', 'beschaeftigungsart', "vollzeit") ?? "Vollzeit"; } }, { key: "teilzeit", get label() { return lookupLabel('mitarbeitende', 'beschaeftigungsart', "teilzeit") ?? "Teilzeit"; } }, { key: "minijob", get label() { return lookupLabel('mitarbeitende', 'beschaeftigungsart', "minijob") ?? "Minijob"; } }, { key: "praktikum", get label() { return lookupLabel('mitarbeitende', 'beschaeftigungsart', "praktikum") ?? "Praktikum"; } }, { key: "werkstudent", get label() { return lookupLabel('mitarbeitende', 'beschaeftigungsart', "werkstudent") ?? "Werkstudent"; } }],
    geschlecht: [{ key: "weiblich", get label() { return lookupLabel('mitarbeitende', 'geschlecht', "weiblich") ?? "Weiblich"; } }, { key: "maennlich", get label() { return lookupLabel('mitarbeitende', 'geschlecht', "maennlich") ?? "Männlich"; } }, { key: "divers", get label() { return lookupLabel('mitarbeitende', 'geschlecht', "divers") ?? "Divers"; } }, { key: "keine_angabe", get label() { return lookupLabel('mitarbeitende', 'geschlecht', "keine_angabe") ?? "Keine Angabe"; } }],
  },
  'abwesenheiten': {
    abwesenheitstyp: [{ key: "urlaub", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "urlaub") ?? "Urlaub"; } }, { key: "krankheit", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "krankheit") ?? "Krankheit"; } }, { key: "elternzeit", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "elternzeit") ?? "Elternzeit"; } }, { key: "sonderurlaub", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "sonderurlaub") ?? "Sonderurlaub"; } }, { key: "unbezahlter_urlaub", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "unbezahlter_urlaub") ?? "Unbezahlter Urlaub"; } }, { key: "fortbildung", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "fortbildung") ?? "Fortbildung"; } }, { key: "sonstiges", get label() { return lookupLabel('abwesenheiten', 'abwesenheitstyp', "sonstiges") ?? "Sonstiges"; } }],
    status: [{ key: "beantragt", get label() { return lookupLabel('abwesenheiten', 'status', "beantragt") ?? "Beantragt"; } }, { key: "genehmigt", get label() { return lookupLabel('abwesenheiten', 'status', "genehmigt") ?? "Genehmigt"; } }, { key: "abgelehnt", get label() { return lookupLabel('abwesenheiten', 'status', "abgelehnt") ?? "Abgelehnt"; } }, { key: "storniert", get label() { return lookupLabel('abwesenheiten', 'status', "storniert") ?? "Storniert"; } }],
  },
  'leistungsbeurteilungen': {
    beurteilungszeitraum: [{ key: "q1", get label() { return lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', "q1") ?? "1. Quartal (Q1)"; } }, { key: "q2", get label() { return lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', "q2") ?? "2. Quartal (Q2)"; } }, { key: "q3", get label() { return lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', "q3") ?? "3. Quartal (Q3)"; } }, { key: "q4", get label() { return lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', "q4") ?? "4. Quartal (Q4)"; } }, { key: "jaehrlich", get label() { return lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', "jaehrlich") ?? "Jährlich"; } }, { key: "halbjaehrlich", get label() { return lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', "halbjaehrlich") ?? "Halbjährlich"; } }],
    gesamtbewertung: [{ key: "hervorragend", get label() { return lookupLabel('leistungsbeurteilungen', 'gesamtbewertung', "hervorragend") ?? "Hervorragend"; } }, { key: "gut", get label() { return lookupLabel('leistungsbeurteilungen', 'gesamtbewertung', "gut") ?? "Gut"; } }, { key: "befriedigend", get label() { return lookupLabel('leistungsbeurteilungen', 'gesamtbewertung', "befriedigend") ?? "Befriedigend"; } }, { key: "verbesserungsbedarf", get label() { return lookupLabel('leistungsbeurteilungen', 'gesamtbewertung', "verbesserungsbedarf") ?? "Verbesserungsbedarf"; } }, { key: "unzureichend", get label() { return lookupLabel('leistungsbeurteilungen', 'gesamtbewertung', "unzureichend") ?? "Unzureichend"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'abteilungen': {
    'abteilungsname': 'string/text',
    'abteilungscode': 'string/text',
    'beschreibung': 'string/textarea',
    'leiter_vorname': 'string/text',
    'leiter_nachname': 'string/text',
    'standort': 'string/text',
    'kostenstelle': 'string/text',
  },
  'stellen': {
    'stellenbezeichnung': 'string/text',
    'stellencode': 'string/text',
    'abteilung': 'applookup/select',
    'beschaeftigungsart': 'lookup/select',
    'senioritaet': 'lookup/select',
    'aufgaben': 'string/textarea',
    'qualifikationen': 'string/textarea',
  },
  'mitarbeitende': {
    'postleitzahl': 'string/text',
    'ort': 'string/text',
    'personalnummer': 'string/text',
    'eintrittsdatum': 'date/date',
    'beschaeftigungsart': 'lookup/select',
    'abteilung': 'applookup/select',
    'stelle': 'applookup/select',
    'notfall_vorname': 'string/text',
    'notfall_nachname': 'string/text',
    'notfall_telefon': 'string/tel',
    'iban': 'string/text',
    'notizen': 'string/textarea',
    'profilbild': 'file',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'geburtsdatum': 'date/date',
    'geschlecht': 'lookup/select',
    'nationalitaet': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
  },
  'abwesenheiten': {
    'mitarbeiter': 'applookup/select',
    'abwesenheitstyp': 'lookup/select',
    'startdatum': 'date/date',
    'enddatum': 'date/date',
    'anzahl_tage': 'number',
    'grund': 'string/textarea',
    'status': 'lookup/select',
    'genehmigt_von': 'string/text',
  },
  'leistungsbeurteilungen': {
    'mitarbeiter': 'applookup/select',
    'beurteilungszeitraum': 'lookup/select',
    'beurteilungsdatum': 'date/date',
    'beurteiler_vorname': 'string/text',
    'beurteiler_nachname': 'string/text',
    'gesamtbewertung': 'lookup/select',
    'ziele_erreicht': 'string/textarea',
    'staerken': 'string/textarea',
    'verbesserungsbereiche': 'string/textarea',
    'entwicklungsplan': 'string/textarea',
    'mitarbeiter_kommentar': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateAbteilungen = StripLookup<Abteilungen['fields']>;
export type CreateStellen = StripLookup<Stellen['fields']>;
export type CreateMitarbeitende = StripLookup<Mitarbeitende['fields']>;
export type CreateAbwesenheiten = StripLookup<Abwesenheiten['fields']>;
export type CreateLeistungsbeurteilungen = StripLookup<Leistungsbeurteilungen['fields']>;