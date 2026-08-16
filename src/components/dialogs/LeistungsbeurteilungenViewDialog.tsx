import type { Leistungsbeurteilungen, Mitarbeitende } from '@/types/app';
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

interface LeistungsbeurteilungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Leistungsbeurteilungen | null;
  onEdit: (record: Leistungsbeurteilungen) => void;
  mitarbeitendeList: Mitarbeitende[];
}

export function LeistungsbeurteilungenViewDialog({ open, onClose, record, onEdit, mitarbeitendeList }: LeistungsbeurteilungenViewDialogProps) {
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
          <DialogTitle>{t('view_entity', { entity: appLabel('leistungsbeurteilungen') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'mitarbeiter')}</Label>
            <p className="text-sm">{getMitarbeitendeDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'beurteilungszeitraum')}</Label>
            <Badge variant="secondary">{lookupLabel('leistungsbeurteilungen', 'beurteilungszeitraum', record.fields.beurteilungszeitraum?.key) ?? record.fields.beurteilungszeitraum?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'beurteilungsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.beurteilungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'beurteiler_vorname')}</Label>
            <p className="text-sm">{record.fields.beurteiler_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'beurteiler_nachname')}</Label>
            <p className="text-sm">{record.fields.beurteiler_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'gesamtbewertung')}</Label>
            <Badge variant="secondary">{lookupLabel('leistungsbeurteilungen', 'gesamtbewertung', record.fields.gesamtbewertung?.key) ?? record.fields.gesamtbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'ziele_erreicht')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ziele_erreicht ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'staerken')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.staerken ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'verbesserungsbereiche')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.verbesserungsbereiche ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'entwicklungsplan')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.entwicklungsplan ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungsbeurteilungen', 'mitarbeiter_kommentar')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.mitarbeiter_kommentar ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.LEISTUNGSBEURTEILUNGEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}