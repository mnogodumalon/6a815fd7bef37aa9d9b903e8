/**
 * MitarbeitendeDialog — pre-generated create/edit dialog for Mitarbeitende.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * abteilungenList (full hook array — resolves the Abteilungen applookup),
 * stellenList (full hook array — resolves the Stellen applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * MitarbeitendeDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Mitarbeitende['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<MitarbeitendeDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Mitarbeitende, Abteilungen, Stellen, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Mitarbeitende';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { AbteilungenDialog } from '@/components/dialogs/AbteilungenDialog';
import { StellenDialog } from '@/components/dialogs/StellenDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for MitarbeitendeDialog.defaultValues — see file header. */
export type MitarbeitendeDialogDefaults = Omit<Mitarbeitende['fields'], 'beschaeftigungsart' | 'geschlecht'> & {
    beschaeftigungsart?: LookupValue | string;
    geschlecht?: LookupValue | string;
  };

interface MitarbeitendeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Mitarbeitende['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: MitarbeitendeDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  abteilungenList: Abteilungen[];
  stellenList: Stellen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  beschaeftigungsart: LOOKUP_OPTIONS['mitarbeitende']?.['beschaeftigungsart'] ?? [],
  geschlecht: LOOKUP_OPTIONS['mitarbeitende']?.['geschlecht'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  abteilung: APP_IDS.ABTEILUNGEN,
  stelle: APP_IDS.STELLEN,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function MitarbeitendeDialog({ open, onClose, onSubmit, defaultValues, recordId, abteilungenList, stellenList, enablePhotoScan = true, enablePhotoLocation = true }: MitarbeitendeDialogProps) {
  const [fields, setFields] = useState<Partial<Mitarbeitende['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Abteilungen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAbteilungen` list, and select it in
  // the originating Combobox via the captured `createAbteilungenField`.
  const [createAbteilungenOpen, setCreateAbteilungenOpen] = useState(false);
  const [createAbteilungenInitial, setCreateAbteilungenInitial] = useState('');
  const [createAbteilungenField, setCreateAbteilungenField] = useState<string>('');
  const [extraAbteilungen, setExtraAbteilungen] = useState< Abteilungen[]>([]);
  const abteilungenListAll = useMemo(
    () => [...abteilungenList, ...extraAbteilungen],
    [abteilungenList, extraAbteilungen],
  );
  function openCreateAbteilungen(fieldKey: string, q: string) {
    setCreateAbteilungenField(fieldKey);
    setCreateAbteilungenInitial(q);
    setCreateAbteilungenOpen(true);
  }
  // Inline-Create state for "Stellen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraStellen` list, and select it in
  // the originating Combobox via the captured `createStellenField`.
  const [createStellenOpen, setCreateStellenOpen] = useState(false);
  const [createStellenInitial, setCreateStellenInitial] = useState('');
  const [createStellenField, setCreateStellenField] = useState<string>('');
  const [extraStellen, setExtraStellen] = useState< Stellen[]>([]);
  const stellenListAll = useMemo(
    () => [...stellenList, ...extraStellen],
    [stellenList, extraStellen],
  );
  function openCreateStellen(fieldKey: string, q: string) {
    setCreateStellenField(fieldKey);
    setCreateStellenInitial(q);
    setCreateStellenOpen(true);
  }
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['eintrittsdatum', 'beschaeftigungsart', 'abteilung', 'vorname', 'nachname', 'email'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'abteilung': abteilungenList,
      'stelle': stellenList,
    },
  }), [abteilungenList, stellenList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Mitarbeitende['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'mitarbeitende');
      await onSubmit(clean as Mitarbeitende['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="abteilung" entity="Abteilungen">\n${JSON.stringify(abteilungenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="stelle" entity="Stellen">\n${JSON.stringify(stellenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "postleitzahl": string | null, // Postleitzahl\n  "ort": string | null, // Ort\n  "personalnummer": string | null, // Personalnummer\n  "eintrittsdatum": string | null, // YYYY-MM-DD\n  "beschaeftigungsart": LookupValue | null, // Beschäftigungsart (select one key: "vollzeit" | "teilzeit" | "minijob" | "praktikum" | "werkstudent") mapping: vollzeit=Vollzeit, teilzeit=Teilzeit, minijob=Minijob, praktikum=Praktikum, werkstudent=Werkstudent\n  "abteilung": string | null, // Display name from Abteilungen (see <available-records>)\n  "stelle": string | null, // Display name from Stellen (see <available-records>)\n  "notfall_vorname": string | null, // Vorname Notfallkontakt\n  "notfall_nachname": string | null, // Nachname Notfallkontakt\n  "notfall_telefon": string | null, // Telefon Notfallkontakt\n  "iban": string | null, // IBAN\n  "notizen": string | null, // Notizen\n  "vorname": string | null, // Vorname\n  "nachname": string | null, // Nachname\n  "geburtsdatum": string | null, // YYYY-MM-DD\n  "geschlecht": LookupValue | null, // Geschlecht (select one key: "weiblich" | "maennlich" | "divers" | "keine_angabe") mapping: weiblich=Weiblich, maennlich=Männlich, divers=Divers, keine_angabe=Keine Angabe\n  "nationalitaet": string | null, // Nationalität\n  "email": string | null, // E-Mail-Adresse\n  "telefon": string | null, // Telefonnummer\n  "strasse": string | null, // Straße\n  "hausnummer": string | null, // Hausnummer\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["abteilung", "stelle"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const abteilungName = raw['abteilung'] as string | null;
        if (abteilungName) {
          const abteilungMatch = abteilungenList.find(r => matchName(abteilungName!, [String(r.fields.abteilungsname ?? '')]));
          if (abteilungMatch) merged['abteilung'] = createRecordUrl(APP_IDS.ABTEILUNGEN, abteilungMatch.record_id);
        }
        const stelleName = raw['stelle'] as string | null;
        if (stelleName) {
          const stelleMatch = stellenList.find(r => matchName(stelleName!, [String(r.fields.stellenbezeichnung ?? '')]));
          if (stelleMatch) merged['stelle'] = createRecordUrl(APP_IDS.STELLEN, stelleMatch.record_id);
        }
        return merged as Partial<Mitarbeitende['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, profilbild: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues
    ? t('edit_entity', { entity: appLabel('mitarbeitende') })
    : t('new_entity', { entity: appLabel('mitarbeitende') });

  const fieldBlocks: Record<string, React.ReactNode> = {
    'postleitzahl': (
      <div key="postleitzahl" className="space-y-1.5">
        <Label htmlFor="postleitzahl">{fieldLabel('mitarbeitende', 'postleitzahl')}</Label>
        <Input
          id="postleitzahl"
          placeholder="z. B. 10115"
          value={fields.postleitzahl ?? ''}
          onChange={e => setFields(f => ({ ...f, postleitzahl: e.target.value }))}
        />
      </div>
    ),
    'ort': (
      <div key="ort" className="space-y-1.5">
        <Label htmlFor="ort">{fieldLabel('mitarbeitende', 'ort')}</Label>
        <Input
          id="ort"
          placeholder="z. B. Berlin"
          value={fields.ort ?? ''}
          onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
        />
      </div>
    ),
    'personalnummer': (
      <div key="personalnummer" className="space-y-1.5">
        <Label htmlFor="personalnummer">{fieldLabel('mitarbeitende', 'personalnummer')}</Label>
        <Input
          id="personalnummer"
          placeholder="z. B. MA-2026-001"
          value={fields.personalnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, personalnummer: e.target.value }))}
        />
      </div>
    ),
    'eintrittsdatum': (
      <div key="eintrittsdatum" className="space-y-1.5">
        <Label htmlFor="eintrittsdatum">{fieldLabel('mitarbeitende', 'eintrittsdatum')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <DatePicker
          id="eintrittsdatum"
          placeholder="Wann tritt die Person ein?"
          mode="date"
          value={fields.eintrittsdatum ?? null}
          onChange={v => setFields(f => ({ ...f, eintrittsdatum: v ?? undefined }))}
          required
        />
        {showErrors && !fields.eintrittsdatum && (
          <p className="text-xs text-destructive mt-1">{t('required_hint')}</p>
        )}
      </div>
    ),
    'beschaeftigungsart': (
      <div key="beschaeftigungsart" className="space-y-1.5">
        <Label htmlFor="beschaeftigungsart">{fieldLabel('mitarbeitende', 'beschaeftigungsart')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.beschaeftigungsart) === 'vollzeit'}
            onClick={() => setFields(f => ({ ...f, beschaeftigungsart: (lookupKey(f.beschaeftigungsart) === 'vollzeit' ? undefined : 'vollzeit') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.beschaeftigungsart) === 'vollzeit'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'beschaeftigungsart', 'vollzeit') ?? 'Vollzeit'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.beschaeftigungsart) === 'teilzeit'}
            onClick={() => setFields(f => ({ ...f, beschaeftigungsart: (lookupKey(f.beschaeftigungsart) === 'teilzeit' ? undefined : 'teilzeit') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.beschaeftigungsart) === 'teilzeit'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'beschaeftigungsart', 'teilzeit') ?? 'Teilzeit'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.beschaeftigungsart) === 'minijob'}
            onClick={() => setFields(f => ({ ...f, beschaeftigungsart: (lookupKey(f.beschaeftigungsart) === 'minijob' ? undefined : 'minijob') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.beschaeftigungsart) === 'minijob'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'beschaeftigungsart', 'minijob') ?? 'Minijob'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.beschaeftigungsart) === 'praktikum'}
            onClick={() => setFields(f => ({ ...f, beschaeftigungsart: (lookupKey(f.beschaeftigungsart) === 'praktikum' ? undefined : 'praktikum') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.beschaeftigungsart) === 'praktikum'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'beschaeftigungsart', 'praktikum') ?? 'Praktikum'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.beschaeftigungsart) === 'werkstudent'}
            onClick={() => setFields(f => ({ ...f, beschaeftigungsart: (lookupKey(f.beschaeftigungsart) === 'werkstudent' ? undefined : 'werkstudent') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.beschaeftigungsart) === 'werkstudent'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'beschaeftigungsart', 'werkstudent') ?? 'Werkstudent'}
          </button>
        </div>
        {showErrors && !fields.beschaeftigungsart && (
          <p className="text-xs text-destructive mt-1">{t('required_hint')}</p>
        )}
      </div>
    ),
    'abteilung': (
      <div key="abteilung" className="space-y-1.5">
        <Label htmlFor="abteilung">{fieldLabel('mitarbeitende', 'abteilung')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="abteilung"
          placeholder="Abteilung zuweisen"
          items={abteilungenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.abteilungsname ?? r.record_id),
          }))}
          value={extractRecordId(fields.abteilung)}
          onChange={id => setFields(f => ({ ...f, abteilung: id ? createRecordUrl(APP_IDS.ABTEILUNGEN, id) : undefined }))}
          onCreateNew={(q) => openCreateAbteilungen("abteilung", q)}
          createLabel={t('create_in', { entity: appLabel('abteilungen') })}
        />
        {showErrors && !fields.abteilung && (
          <p className="text-xs text-destructive mt-1">{t('required_hint')}</p>
        )}
      </div>
    ),
    'stelle': (
      <div key="stelle" className="space-y-1.5">
        <Label htmlFor="stelle">{fieldLabel('mitarbeitende', 'stelle')}</Label>
        <Combobox
          id="stelle"
          placeholder="Stelle zuweisen"
          items={stellenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.stellenbezeichnung ?? r.record_id),
          }))}
          value={extractRecordId(fields.stelle)}
          onChange={id => setFields(f => ({ ...f, stelle: id ? createRecordUrl(APP_IDS.STELLEN, id) : undefined }))}
          onCreateNew={(q) => openCreateStellen("stelle", q)}
          createLabel={t('create_in', { entity: appLabel('stellen') })}
        />
      </div>
    ),
    'notfall_vorname': (
      <div key="notfall_vorname" className="space-y-1.5">
        <Label htmlFor="notfall_vorname">{fieldLabel('mitarbeitende', 'notfall_vorname')}</Label>
        <Input
          id="notfall_vorname"
          placeholder="z. B. Klaus"
          value={fields.notfall_vorname ?? ''}
          onChange={e => setFields(f => ({ ...f, notfall_vorname: e.target.value }))}
        />
      </div>
    ),
    'notfall_nachname': (
      <div key="notfall_nachname" className="space-y-1.5">
        <Label htmlFor="notfall_nachname">{fieldLabel('mitarbeitende', 'notfall_nachname')}</Label>
        <Input
          id="notfall_nachname"
          placeholder="z. B. Meyer"
          value={fields.notfall_nachname ?? ''}
          onChange={e => setFields(f => ({ ...f, notfall_nachname: e.target.value }))}
        />
      </div>
    ),
    'notfall_telefon': (
      <div key="notfall_telefon" className="space-y-1.5">
        <Label htmlFor="notfall_telefon">{fieldLabel('mitarbeitende', 'notfall_telefon')}</Label>
        <Input
          id="notfall_telefon"
          value={fields.notfall_telefon ?? ''}
          onChange={e => setFields(f => ({ ...f, notfall_telefon: e.target.value }))}
        />
      </div>
    ),
    'iban': (
      <div key="iban" className="space-y-1.5">
        <Label htmlFor="iban">{fieldLabel('mitarbeitende', 'iban')}</Label>
        <Input
          id="iban"
          placeholder="z. B. DE75512108001234567890"
          value={fields.iban ?? ''}
          onChange={e => setFields(f => ({ ...f, iban: e.target.value }))}
        />
      </div>
    ),
    'notizen': (
      <div key="notizen" className="space-y-1.5">
        <Label htmlFor="notizen">{fieldLabel('mitarbeitende', 'notizen')}</Label>
        <Textarea
          id="notizen"
          placeholder="Spezielle Informationen, Allergien, Besonderheiten..."
          value={fields.notizen ?? ''}
          onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'profilbild': (
      <div key="profilbild" className="space-y-1.5">
        <Label htmlFor="profilbild">{fieldLabel('mitarbeitende', 'profilbild')}</Label>
        {fields.profilbild ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <IconFileText size={20} className="text-muted-foreground" />
              </div>
              <img
                src={fields.profilbild}
                alt=""
                className="relative h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-foreground">{fields.profilbild.split("/").pop()}</p>
              <div className="flex gap-2 mt-1">
                <label
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {t('fr_change')}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fileUrl = await uploadFile(file, file.name);
                        setFields(f => ({ ...f, profilbild: fileUrl }));
                      } catch (err) { console.error('Upload failed:', err); }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setFields(f => ({ ...f, profilbild: undefined }))}
                >
                  {t('fr_remove')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <IconUpload size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('fr_upload_file')}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const fileUrl = await uploadFile(file, file.name);
                  setFields(f => ({ ...f, profilbild: fileUrl }));
                } catch (err) { console.error('Upload failed:', err); }
              }}
            />
          </label>
        )}
      </div>
    ),
    'vorname': (
      <div key="vorname" className="space-y-1.5">
        <Label htmlFor="vorname">{fieldLabel('mitarbeitende', 'vorname')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="vorname"
          placeholder="z. B. Maria"
          value={fields.vorname ?? ''}
          onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
          required
        />
        {showErrors && !fields.vorname && (
          <p className="text-xs text-destructive mt-1">{t('required_hint')}</p>
        )}
      </div>
    ),
    'nachname': (
      <div key="nachname" className="space-y-1.5">
        <Label htmlFor="nachname">{fieldLabel('mitarbeitende', 'nachname')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="nachname"
          placeholder="z. B. Schmidt"
          value={fields.nachname ?? ''}
          onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
          required
        />
        {showErrors && !fields.nachname && (
          <p className="text-xs text-destructive mt-1">{t('required_hint')}</p>
        )}
      </div>
    ),
    'geburtsdatum': (
      <div key="geburtsdatum" className="space-y-1.5">
        <Label htmlFor="geburtsdatum">{fieldLabel('mitarbeitende', 'geburtsdatum')}</Label>
        <DatePicker
          id="geburtsdatum"
          placeholder="Wann ist der Geburtstag?"
          mode="date"
          value={fields.geburtsdatum ?? null}
          onChange={v => setFields(f => ({ ...f, geburtsdatum: v ?? undefined }))}
        />
      </div>
    ),
    'geschlecht': (
      <div key="geschlecht" className="space-y-1.5">
        <Label htmlFor="geschlecht">{fieldLabel('mitarbeitende', 'geschlecht')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.geschlecht) === 'weiblich'}
            onClick={() => setFields(f => ({ ...f, geschlecht: (lookupKey(f.geschlecht) === 'weiblich' ? undefined : 'weiblich') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.geschlecht) === 'weiblich'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'geschlecht', 'weiblich') ?? 'Weiblich'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.geschlecht) === 'maennlich'}
            onClick={() => setFields(f => ({ ...f, geschlecht: (lookupKey(f.geschlecht) === 'maennlich' ? undefined : 'maennlich') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.geschlecht) === 'maennlich'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'geschlecht', 'maennlich') ?? 'Männlich'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.geschlecht) === 'divers'}
            onClick={() => setFields(f => ({ ...f, geschlecht: (lookupKey(f.geschlecht) === 'divers' ? undefined : 'divers') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.geschlecht) === 'divers'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'geschlecht', 'divers') ?? 'Divers'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.geschlecht) === 'keine_angabe'}
            onClick={() => setFields(f => ({ ...f, geschlecht: (lookupKey(f.geschlecht) === 'keine_angabe' ? undefined : 'keine_angabe') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.geschlecht) === 'keine_angabe'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('mitarbeitende', 'geschlecht', 'keine_angabe') ?? 'Keine Angabe'}
          </button>
        </div>
      </div>
    ),
    'nationalitaet': (
      <div key="nationalitaet" className="space-y-1.5">
        <Label htmlFor="nationalitaet">{fieldLabel('mitarbeitende', 'nationalitaet')}</Label>
        <Input
          id="nationalitaet"
          placeholder="z. B. Deutsch, Italienisch"
          value={fields.nationalitaet ?? ''}
          onChange={e => setFields(f => ({ ...f, nationalitaet: e.target.value }))}
        />
      </div>
    ),
    'email': (
      <div key="email" className="space-y-1.5">
        <Label htmlFor="email">{fieldLabel('mitarbeitende', 'email')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="email"
          type="email"
          placeholder="z. B. maria@example.com"
          value={fields.email ?? ''}
          onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
        />
        {showErrors && !fields.email && (
          <p className="text-xs text-destructive mt-1">{t('required_hint')}</p>
        )}
      </div>
    ),
    'telefon': (
      <div key="telefon" className="space-y-1.5">
        <Label htmlFor="telefon">{fieldLabel('mitarbeitende', 'telefon')}</Label>
        <Input
          id="telefon"
          value={fields.telefon ?? ''}
          onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
        />
      </div>
    ),
    'strasse': (
      <div key="strasse" className="space-y-1.5">
        <Label htmlFor="strasse">{fieldLabel('mitarbeitende', 'strasse')}</Label>
        <Input
          id="strasse"
          placeholder="z. B. Hauptstraße"
          value={fields.strasse ?? ''}
          onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
        />
      </div>
    ),
    'hausnummer': (
      <div key="hausnummer" className="space-y-1.5">
        <Label htmlFor="hausnummer">{fieldLabel('mitarbeitende', 'hausnummer')}</Label>
        <Input
          id="hausnummer"
          placeholder="z. B. 42"
          value={fields.hausnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"postleitzahl": "Postleitzahl", "ort": "Ort", "personalnummer": "Personalnummer", "eintrittsdatum": "Eintrittsdatum", "beschaeftigungsart": "Beschäftigungsart", "abteilung": "Abteilung", "stelle": "Stelle", "notfall_vorname": "Vorname Notfallkontakt", "notfall_nachname": "Nachname Notfallkontakt", "notfall_telefon": "Telefon Notfallkontakt", "iban": "IBAN", "notizen": "Notizen", "profilbild": "Profilbild", "vorname": "Vorname", "nachname": "Nachname", "geburtsdatum": "Geburtsdatum", "geschlecht": "Geschlecht", "nationalitaet": "Nationalität", "email": "E-Mail-Adresse", "telefon": "Telefonnummer", "strasse": "Straße", "hausnummer": "Hausnummer"};
  const CURRENCY_KEYS = new Set<string>([]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"abteilung": {"abteilungsname": "Abteilungsname", "abteilungscode": "Abteilungscode", "beschreibung": "Beschreibung", "leiter_vorname": "Vorname der Abteilungsleitung", "leiter_nachname": "Nachname der Abteilungsleitung", "standort": "Standort / Büro", "kostenstelle": "Kostenstelle"}, "stelle": {"stellenbezeichnung": "Stellenbezeichnung", "stellencode": "Stellencode", "abteilung": "Abteilung", "beschaeftigungsart": "Beschäftigungsart", "senioritaet": "Senioritätsstufe", "aufgaben": "Aufgaben und Verantwortlichkeiten", "qualifikationen": "Erforderliche Qualifikationen"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.MITARBEITENDE} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createAbteilungenOpen && (
      <AbteilungenDialog
        open={createAbteilungenOpen}
        onClose={() => setCreateAbteilungenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAbteilungenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Abteilungen;
            setExtraAbteilungen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ABTEILUNGEN, result.id);
            setFields(prev => ({ ...prev, [createAbteilungenField]: url } as any));
          }
          setCreateAbteilungenOpen(false);
        }}
        defaultValues={createAbteilungenInitial
          ? ({ abteilungsname: createAbteilungenInitial } as any)
          : undefined}
      />
    )}
    {createStellenOpen && (
      <StellenDialog
        open={createStellenOpen}
        onClose={() => setCreateStellenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createStellenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Stellen;
            setExtraStellen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.STELLEN, result.id);
            setFields(prev => ({ ...prev, [createStellenField]: url } as any));
          }
          setCreateStellenOpen(false);
        }}
        defaultValues={createStellenInitial
          ? ({ stellenbezeichnung: createStellenInitial } as any)
          : undefined}
        abteilungenList={abteilungenList}
      />
    )}
    </>
  );
}