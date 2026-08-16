import type { Abteilungen, Stellen, Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface AbteilungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Abteilungen;
  /** 1:N „Stellen": VOLLE Liste — der Block filtert auf diesen Record. */
  stellenList: Stellen[];
  /** Zeilen-Klick → overlay.push auf das Stellen-Detail (nie der Edit-Dialog). */
  onOpenStellen: (record: Stellen) => void;
  /** Kontextuelles „+": öffnet den Stellen-Dialog mit diesem Record vorgesetzt. */
  onAddStellen: () => void;
  /** 1:N „Mitarbeitende": VOLLE Liste — der Block filtert auf diesen Record. */
  mitarbeitendeList: Mitarbeitende[];
  /** Zeilen-Klick → overlay.push auf das Mitarbeitende-Detail (nie der Edit-Dialog). */
  onOpenMitarbeitende: (record: Mitarbeitende) => void;
  /** Kontextuelles „+": öffnet den Mitarbeitende-Dialog mit diesem Record vorgesetzt. */
  onAddMitarbeitende: () => void;
}

export function AbteilungenDetails({
  record,
  stellenList,
  onOpenStellen,
  onAddStellen,
  mitarbeitendeList,
  onOpenMitarbeitende,
  onAddMitarbeitende,
}: AbteilungenDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('abteilungen', 'abteilungsname')} value={record.fields.abteilungsname} format="text" />
        <RecordField label={fieldLabel('abteilungen', 'abteilungscode')} value={record.fields.abteilungscode} format="text" />
        <RecordField label={fieldLabel('abteilungen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('abteilungen', 'leiter_vorname')} value={record.fields.leiter_vorname} format="text" />
        <RecordField label={fieldLabel('abteilungen', 'leiter_nachname')} value={record.fields.leiter_nachname} format="text" />
        <RecordField label={fieldLabel('abteilungen', 'standort')} value={record.fields.standort} format="text" />
        <RecordField label={fieldLabel('abteilungen', 'kostenstelle')} value={record.fields.kostenstelle} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('stellen')}
        items={stellenList.filter(r => extractRecordId(r.fields.abteilung) === record.record_id)}
        map={r => ({ name: r.fields.stellenbezeichnung ?? appLabel('stellen'), meta: undefined })}
        onOpen={onOpenStellen}
        onAdd={onAddStellen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('mitarbeitende')}
        items={mitarbeitendeList.filter(r => extractRecordId(r.fields.abteilung) === record.record_id)}
        map={r => ({ name: r.fields.postleitzahl ?? appLabel('mitarbeitende'), meta: r.fields.eintrittsdatum })}
        onOpen={onOpenMitarbeitende}
        onAdd={onAddMitarbeitende}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ABTEILUNGEN} recordId={record.record_id} />
    </>
  );
}
