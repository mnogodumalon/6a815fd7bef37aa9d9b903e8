import type { Stellen, Abteilungen } from '@/types/app';
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
import { t, appLabel, fieldLabel, lookupLabel } from '@/i18n';

interface StellenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Stellen | null;
  onEdit: (record: Stellen) => void;
  abteilungenList: Abteilungen[];
}

export function StellenViewDialog({ open, onClose, record, onEdit, abteilungenList }: StellenViewDialogProps) {
  function getAbteilungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return abteilungenList.find(r => r.record_id === id)?.fields.abteilungsname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('stellen') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'stellenbezeichnung')}</Label>
            <p className="text-sm">{record.fields.stellenbezeichnung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'stellencode')}</Label>
            <p className="text-sm">{record.fields.stellencode ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'abteilung')}</Label>
            <p className="text-sm">{getAbteilungenDisplayName(record.fields.abteilung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'beschaeftigungsart')}</Label>
            <Badge variant="secondary">{lookupLabel('stellen', 'beschaeftigungsart', record.fields.beschaeftigungsart?.key) ?? record.fields.beschaeftigungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'senioritaet')}</Label>
            <Badge variant="secondary">{lookupLabel('stellen', 'senioritaet', record.fields.senioritaet?.key) ?? record.fields.senioritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'aufgaben')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.aufgaben ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('stellen', 'qualifikationen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.qualifikationen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.STELLEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}