import type { Leistungsbeurteilungen, Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface LeistungsbeurteilungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leistungsbeurteilungen;
  /** N:1-Ziel „Mitarbeitende": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  mitarbeitendeList: Mitarbeitende[];
  /** Klick auf die Mitarbeitende-Relation → overlay.push auf dessen Detail. */
  onOpenMitarbeitende?: (record: Mitarbeitende) => void;
}

export function LeistungsbeurteilungenDetails({
  record,
  mitarbeitendeList,
  onOpenMitarbeitende,
}: LeistungsbeurteilungenDetailsProps) {
  const mitarbeiterTarget = mitarbeitendeList.find(r => r.record_id === extractRecordId(record.fields.mitarbeiter));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'beurteilungszeitraum')} value={record.fields.beurteilungszeitraum} format="pill" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'beurteilungsdatum')} value={record.fields.beurteilungsdatum} format="date" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'beurteiler_vorname')} value={record.fields.beurteiler_vorname} format="text" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'beurteiler_nachname')} value={record.fields.beurteiler_nachname} format="text" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'gesamtbewertung')} value={record.fields.gesamtbewertung} format="pill" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'ziele_erreicht')} value={record.fields.ziele_erreicht} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'staerken')} value={record.fields.staerken} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'verbesserungsbereiche')} value={record.fields.verbesserungsbereiche} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'entwicklungsplan')} value={record.fields.entwicklungsplan} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'mitarbeiter_kommentar')} value={record.fields.mitarbeiter_kommentar} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('leistungsbeurteilungen', 'mitarbeiter')}
          name={mitarbeiterTarget?.fields.vorname ?? '—'}
          meta={[mitarbeiterTarget?.fields.notfall_telefon, mitarbeiterTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={mitarbeiterTarget && onOpenMitarbeitende ? () => onOpenMitarbeitende!(mitarbeiterTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.LEISTUNGSBEURTEILUNGEN} recordId={record.record_id} />
    </>
  );
}
