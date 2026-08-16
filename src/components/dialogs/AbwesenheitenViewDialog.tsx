import type { Abwesenheiten, Mitarbeitende } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface AbwesenheitenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Abwesenheiten | null;
  onEdit: (record: Abwesenheiten) => void;
  mitarbeitendeList: Mitarbeitende[];
}

export function AbwesenheitenViewDialog({ open, onClose, record, onEdit, mitarbeitendeList }: AbwesenheitenViewDialogProps) {
  function getMitarbeitendeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeitendeList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('abwesenheiten') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'mitarbeiter')}</Label>
            <p className="text-sm">{getMitarbeitendeDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'abwesenheitstyp')}</Label>
            <Badge variant="secondary">{lookupLabel('abwesenheiten', 'abwesenheitstyp', record.fields.abwesenheitstyp?.key) ?? record.fields.abwesenheitstyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'startdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.startdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'enddatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.enddatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'anzahl_tage')}</Label>
            <p className="text-sm">{record.fields.anzahl_tage ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'grund')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.grund ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'status')}</Label>
            <Badge variant="secondary">{lookupLabel('abwesenheiten', 'status', record.fields.status?.key) ?? record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('abwesenheiten', 'genehmigt_von')}</Label>
            <p className="text-sm">{record.fields.genehmigt_von ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.ABWESENHEITEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}