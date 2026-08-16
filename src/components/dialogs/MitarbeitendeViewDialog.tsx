import type { Mitarbeitende, Abteilungen, Stellen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface MitarbeitendeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Mitarbeitende | null;
  onEdit: (record: Mitarbeitende) => void;
  abteilungenList: Abteilungen[];
  stellenList: Stellen[];
}

export function MitarbeitendeViewDialog({ open, onClose, record, onEdit, abteilungenList, stellenList }: MitarbeitendeViewDialogProps) {
  function getAbteilungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return abteilungenList.find(r => r.record_id === id)?.fields.abteilungsname ?? '—';
  }

  function getStellenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return stellenList.find(r => r.record_id === id)?.fields.stellenbezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('mitarbeitende') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'postleitzahl')}</Label>
            <p className="text-sm">{record.fields.postleitzahl ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'ort')}</Label>
            <p className="text-sm">{record.fields.ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'personalnummer')}</Label>
            <p className="text-sm">{record.fields.personalnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'eintrittsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.eintrittsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'beschaeftigungsart')}</Label>
            <Badge variant="secondary">{lookupLabel('mitarbeitende', 'beschaeftigungsart', record.fields.beschaeftigungsart?.key) ?? record.fields.beschaeftigungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'abteilung')}</Label>
            <p className="text-sm">{getAbteilungenDisplayName(record.fields.abteilung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'stelle')}</Label>
            <p className="text-sm">{getStellenDisplayName(record.fields.stelle)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'notfall_vorname')}</Label>
            <p className="text-sm">{record.fields.notfall_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'notfall_nachname')}</Label>
            <p className="text-sm">{record.fields.notfall_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'notfall_telefon')}</Label>
            <p className="text-sm">{record.fields.notfall_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'iban')}</Label>
            <p className="text-sm">{record.fields.iban ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'notizen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'profilbild')}</Label>
            {record.fields.profilbild ? (
              <MediaThumbnail src={record.fields.profilbild} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'vorname')}</Label>
            <p className="text-sm">{record.fields.vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'nachname')}</Label>
            <p className="text-sm">{record.fields.nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'geburtsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.geburtsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'geschlecht')}</Label>
            <Badge variant="secondary">{lookupLabel('mitarbeitende', 'geschlecht', record.fields.geschlecht?.key) ?? record.fields.geschlecht?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'nationalitaet')}</Label>
            <p className="text-sm">{record.fields.nationalitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'email')}</Label>
            <p className="text-sm">{record.fields.email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'telefon')}</Label>
            <p className="text-sm">{record.fields.telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'strasse')}</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('mitarbeitende', 'hausnummer')}</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.MITARBEITENDE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}