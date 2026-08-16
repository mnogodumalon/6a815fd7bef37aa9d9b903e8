import type { Mitarbeitende, Abteilungen, Stellen, Abwesenheiten, Leistungsbeurteilungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface MitarbeitendeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Mitarbeitende;
  /** N:1-Ziel „Abteilungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  abteilungenList: Abteilungen[];
  /** Klick auf die Abteilungen-Relation → overlay.push auf dessen Detail. */
  onOpenAbteilungen?: (record: Abteilungen) => void;
  /** N:1-Ziel „Stellen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  stellenList: Stellen[];
  /** Klick auf die Stellen-Relation → overlay.push auf dessen Detail. */
  onOpenStellen?: (record: Stellen) => void;
  /** 1:N „Abwesenheiten": VOLLE Liste — der Block filtert auf diesen Record. */
  abwesenheitenList: Abwesenheiten[];
  /** Zeilen-Klick → overlay.push auf das Abwesenheiten-Detail (nie der Edit-Dialog). */
  onOpenAbwesenheiten: (record: Abwesenheiten) => void;
  /** Kontextuelles „+": öffnet den Abwesenheiten-Dialog mit diesem Record vorgesetzt. */
  onAddAbwesenheiten: () => void;
  /** 1:N „Leistungsbeurteilungen": VOLLE Liste — der Block filtert auf diesen Record. */
  leistungsbeurteilungenList: Leistungsbeurteilungen[];
  /** Zeilen-Klick → overlay.push auf das Leistungsbeurteilungen-Detail (nie der Edit-Dialog). */
  onOpenLeistungsbeurteilungen: (record: Leistungsbeurteilungen) => void;
  /** Kontextuelles „+": öffnet den Leistungsbeurteilungen-Dialog mit diesem Record vorgesetzt. */
  onAddLeistungsbeurteilungen: () => void;
}

export function MitarbeitendeDetails({
  record,
  abteilungenList,
  onOpenAbteilungen,
  stellenList,
  onOpenStellen,
  abwesenheitenList,
  onOpenAbwesenheiten,
  onAddAbwesenheiten,
  leistungsbeurteilungenList,
  onOpenLeistungsbeurteilungen,
  onAddLeistungsbeurteilungen,
}: MitarbeitendeDetailsProps) {
  const abteilungTarget = abteilungenList.find(r => r.record_id === extractRecordId(record.fields.abteilung));
  const stelleTarget = stellenList.find(r => r.record_id === extractRecordId(record.fields.stelle));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('mitarbeitende', 'postleitzahl')} value={record.fields.postleitzahl} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'personalnummer')} value={record.fields.personalnummer} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'eintrittsdatum')} value={record.fields.eintrittsdatum} format="date" />
        <RecordField label={fieldLabel('mitarbeitende', 'beschaeftigungsart')} value={record.fields.beschaeftigungsart} format="pill" />
        <RecordField label={fieldLabel('mitarbeitende', 'notfall_vorname')} value={record.fields.notfall_vorname} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notfall_nachname')} value={record.fields.notfall_nachname} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notfall_telefon')} value={record.fields.notfall_telefon} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'iban')} value={record.fields.iban} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('mitarbeitende', 'profilbild')} className="md:col-span-2">
          {record.fields.profilbild ? (
            <MediaThumbnail src={record.fields.profilbild as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('mitarbeitende', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'geburtsdatum')} value={record.fields.geburtsdatum} format="date" />
        <RecordField label={fieldLabel('mitarbeitende', 'geschlecht')} value={record.fields.geschlecht} format="pill" />
        <RecordField label={fieldLabel('mitarbeitende', 'nationalitaet')} value={record.fields.nationalitaet} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('mitarbeitende', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'hausnummer')} value={record.fields.hausnummer} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('mitarbeitende', 'abteilung')}
          name={abteilungTarget?.fields.abteilungsname ?? '—'}
          meta={[abteilungTarget?.fields.abteilungscode, abteilungTarget?.fields.leiter_vorname].filter(Boolean).join(' · ') || undefined}
          onClick={abteilungTarget && onOpenAbteilungen ? () => onOpenAbteilungen!(abteilungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('mitarbeitende', 'stelle')}
          name={stelleTarget?.fields.stellenbezeichnung ?? '—'}
          meta={[stelleTarget?.fields.stellencode].filter(Boolean).join(' · ') || undefined}
          onClick={stelleTarget && onOpenStellen ? () => onOpenStellen!(stelleTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('abwesenheiten')}
        items={abwesenheitenList.filter(r => extractRecordId(r.fields.mitarbeiter) === record.record_id)}
        map={r => ({ name: r.fields.genehmigt_von ?? appLabel('abwesenheiten'), meta: r.fields.startdatum })}
        onOpen={onOpenAbwesenheiten}
        onAdd={onAddAbwesenheiten}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('leistungsbeurteilungen')}
        items={leistungsbeurteilungenList.filter(r => extractRecordId(r.fields.mitarbeiter) === record.record_id)}
        map={r => ({ name: r.fields.beurteiler_vorname ?? appLabel('leistungsbeurteilungen'), meta: r.fields.beurteilungsdatum })}
        onOpen={onOpenLeistungsbeurteilungen}
        onAdd={onAddLeistungsbeurteilungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.MITARBEITENDE} recordId={record.record_id} />
    </>
  );
}
