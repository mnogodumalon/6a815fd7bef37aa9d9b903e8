import type { Stellen, Abteilungen, Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface StellenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Stellen;
  /** N:1-Ziel „Abteilungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  abteilungenList: Abteilungen[];
  /** Klick auf die Abteilungen-Relation → overlay.push auf dessen Detail. */
  onOpenAbteilungen?: (record: Abteilungen) => void;
  /** 1:N „Mitarbeitende": VOLLE Liste — der Block filtert auf diesen Record. */
  mitarbeitendeList: Mitarbeitende[];
  /** Zeilen-Klick → overlay.push auf das Mitarbeitende-Detail (nie der Edit-Dialog). */
  onOpenMitarbeitende: (record: Mitarbeitende) => void;
  /** Kontextuelles „+": öffnet den Mitarbeitende-Dialog mit diesem Record vorgesetzt. */
  onAddMitarbeitende: () => void;
}

export function StellenDetails({
  record,
  abteilungenList,
  onOpenAbteilungen,
  mitarbeitendeList,
  onOpenMitarbeitende,
  onAddMitarbeitende,
}: StellenDetailsProps) {
  const abteilungTarget = abteilungenList.find(r => r.record_id === extractRecordId(record.fields.abteilung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('stellen', 'stellenbezeichnung')} value={record.fields.stellenbezeichnung} format="text" />
        <RecordField label={fieldLabel('stellen', 'stellencode')} value={record.fields.stellencode} format="text" />
        <RecordField label={fieldLabel('stellen', 'beschaeftigungsart')} value={record.fields.beschaeftigungsart} format="pill" />
        <RecordField label={fieldLabel('stellen', 'senioritaet')} value={record.fields.senioritaet} format="pill" />
        <RecordField label={fieldLabel('stellen', 'aufgaben')} value={record.fields.aufgaben} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('stellen', 'qualifikationen')} value={record.fields.qualifikationen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('stellen', 'abteilung')}
          name={abteilungTarget?.fields.abteilungsname ?? '—'}
          meta={[abteilungTarget?.fields.abteilungscode, abteilungTarget?.fields.leiter_vorname].filter(Boolean).join(' · ') || undefined}
          onClick={abteilungTarget && onOpenAbteilungen ? () => onOpenAbteilungen!(abteilungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('mitarbeitende')}
        items={mitarbeitendeList.filter(r => extractRecordId(r.fields.stelle) === record.record_id)}
        map={r => ({ name: r.fields.postleitzahl ?? appLabel('mitarbeitende'), meta: r.fields.eintrittsdatum })}
        onOpen={onOpenMitarbeitende}
        onAdd={onAddMitarbeitende}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.STELLEN} recordId={record.record_id} />
    </>
  );
}
