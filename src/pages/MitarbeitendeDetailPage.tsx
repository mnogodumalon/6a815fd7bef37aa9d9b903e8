import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Mitarbeitende, Abteilungen, Stellen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { MitarbeitendeDialog } from '@/components/dialogs/MitarbeitendeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Mitarbeitende';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function MitarbeitendeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Mitarbeitende | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [abteilungenList, setAbteilungenList] = useState<Abteilungen[]>([]);
  const [stellenList, setStellenList] = useState<Stellen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, abteilungenData, stellenData] = await Promise.all([
        LivingAppsService.getMitarbeitende(),
        LivingAppsService.getAbteilungen(),
        LivingAppsService.getStellen(),
      ]);
      setAbteilungenList(abteilungenData);
      setStellenList(stellenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Mitarbeitende['fields']) {
    if (!record) return;
    await LivingAppsService.updateMitarbeitendeEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteMitarbeitendeEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/mitarbeitende');
  }

  function getAbteilungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return abteilungenList.find(r => r.record_id === refId)?.fields.abteilungsname ?? '—';
  }

  function getStellenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return stellenList.find(r => r.record_id === refId)?.fields.stellenbezeichnung ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/mitarbeitende')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/mitarbeitende')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.postleitzahl ?? appLabel('mitarbeitende')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          abteilung: abteilungenList,
          stelle: stellenList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('mitarbeitende', 'postleitzahl')} value={record.fields.postleitzahl} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'personalnummer')} value={record.fields.personalnummer} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'eintrittsdatum')} value={record.fields.eintrittsdatum} format="date" />
        <RecordField label={fieldLabel('mitarbeitende', 'beschaeftigungsart')} value={record.fields.beschaeftigungsart} format="pill" />
        <RecordField label={fieldLabel('mitarbeitende', 'abteilung')} value={getAbteilungenDisplayName(record.fields.abteilung)} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'stelle')} value={getStellenDisplayName(record.fields.stelle)} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notfall_vorname')} value={record.fields.notfall_vorname} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notfall_nachname')} value={record.fields.notfall_nachname} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notfall_telefon')} value={record.fields.notfall_telefon} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'iban')} value={record.fields.iban} format="text" />
        <RecordField label={fieldLabel('mitarbeitende', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
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

      <RecordAttachments appId={APP_IDS.MITARBEITENDE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <MitarbeitendeDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        abteilungenList={abteilungenList}
        stellenList={stellenList}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeitende']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeitende']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('mitarbeitende') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
