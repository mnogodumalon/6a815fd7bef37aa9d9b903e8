import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Leistungsbeurteilungen, Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { LeistungsbeurteilungenDialog } from '@/components/dialogs/LeistungsbeurteilungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Leistungsbeurteilungen';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function LeistungsbeurteilungenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Leistungsbeurteilungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mitarbeitendeList, setMitarbeitendeList] = useState<Mitarbeitende[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, mitarbeitendeData] = await Promise.all([
        LivingAppsService.getLeistungsbeurteilungen(),
        LivingAppsService.getMitarbeitende(),
      ]);
      setMitarbeitendeList(mitarbeitendeData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Leistungsbeurteilungen['fields']) {
    if (!record) return;
    await LivingAppsService.updateLeistungsbeurteilungenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteLeistungsbeurteilungenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/leistungsbeurteilungen');
  }

  function getMitarbeitendeDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return mitarbeitendeList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/leistungsbeurteilungen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/leistungsbeurteilungen')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.beurteiler_vorname ?? appLabel('leistungsbeurteilungen')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          mitarbeiter: mitarbeitendeList,
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
        <RecordField label={fieldLabel('leistungsbeurteilungen', 'mitarbeiter')} value={getMitarbeitendeDisplayName(record.fields.mitarbeiter)} format="text" />
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

      <RecordAttachments appId={APP_IDS.LEISTUNGSBEURTEILUNGEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <LeistungsbeurteilungenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        mitarbeitendeList={mitarbeitendeList}
        enablePhotoScan={AI_PHOTO_SCAN['Leistungsbeurteilungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leistungsbeurteilungen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('leistungsbeurteilungen') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
