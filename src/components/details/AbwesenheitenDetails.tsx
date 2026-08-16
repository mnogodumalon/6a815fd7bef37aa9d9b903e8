import type { Abwesenheiten, Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface AbwesenheitenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Abwesenheiten;
  /** N:1-Ziel „Mitarbeitende": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  mitarbeitendeList: Mitarbeitende[];
  /** Klick auf die Mitarbeitende-Relation → overlay.push auf dessen Detail. */
  onOpenMitarbeitende?: (record: Mitarbeitende) => void;
}

export function AbwesenheitenDetails({
  record,
  mitarbeitendeList,
  onOpenMitarbeitende,
}: AbwesenheitenDetailsProps) {
  const mitarbeiterTarget = mitarbeitendeList.find(r => r.record_id === extractRecordId(record.fields.mitarbeiter));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('abwesenheiten', 'abwesenheitstyp')} value={record.fields.abwesenheitstyp} format="pill" />
        <RecordField label={fieldLabel('abwesenheiten', 'startdatum')} value={record.fields.startdatum} format="date" />
        <RecordField label={fieldLabel('abwesenheiten', 'enddatum')} value={record.fields.enddatum} format="date" />
        <RecordField label={fieldLabel('abwesenheiten', 'anzahl_tage')} value={record.fields.anzahl_tage} format="text" />
        <RecordField label={fieldLabel('abwesenheiten', 'grund')} value={record.fields.grund} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('abwesenheiten', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('abwesenheiten', 'genehmigt_von')} value={record.fields.genehmigt_von} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('abwesenheiten', 'mitarbeiter')}
          name={mitarbeiterTarget?.fields.vorname ?? '—'}
          meta={[mitarbeiterTarget?.fields.notfall_telefon, mitarbeiterTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={mitarbeiterTarget && onOpenMitarbeitende ? () => onOpenMitarbeitende!(mitarbeiterTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ABWESENHEITEN} recordId={record.record_id} />
    </>
  );
}
