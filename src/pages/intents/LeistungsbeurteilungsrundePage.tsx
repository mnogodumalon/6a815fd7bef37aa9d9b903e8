/**
 * Leistungsbeurteilungsrunde — 4-Schritt-Wizard.
 * Steps: 1) Abteilung wählen → 2) Mitarbeitende auswählen → 3) Beurteilungen erfassen → 4) Zusammenfassung.
 * Reads: abteilungen, mitarbeitende, stellen. Writes: leistungsbeurteilungen (createLeistungsbeurteilungenEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Abteilungen, Mitarbeitende } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { IconBuilding, IconUser, IconChevronDown, IconChevronUp, IconCheck, IconUsers } from '@tabler/icons-react';

// Lookup options from schema
const ZEITRAUM_OPTIONS = LOOKUP_OPTIONS['leistungsbeurteilungen']?.['beurteilungszeitraum'] ?? [];
const BEWERTUNG_OPTIONS = LOOKUP_OPTIONS['leistungsbeurteilungen']?.['gesamtbewertung'] ?? [];

// Per-Mitarbeiter form state
interface BeurteilungsForm {
  beurteilungszeitraum: string;
  beurteilungsdatum: string;
  beurteiler_vorname: string;
  beurteiler_nachname: string;
  gesamtbewertungKey: string;
  ziele_erreicht: string;
  staerken: string;
  verbesserungsbereiche: string;
  entwicklungsplan: string;
  mitarbeiter_kommentar: string;
}

interface SavedResult {
  mitarbeiterId: string;
  name: string;
  gesamtbewertungLabel: string;
}

function makeDefaultForm(): BeurteilungsForm {
  return {
    beurteilungszeitraum: ZEITRAUM_OPTIONS[0]?.key ?? '',
    beurteilungsdatum: '',
    beurteiler_vorname: '',
    beurteiler_nachname: '',
    gesamtbewertungKey: BEWERTUNG_OPTIONS[0]?.key ?? '',
    ziele_erreicht: '',
    staerken: '',
    verbesserungsbereiche: '',
    entwicklungsplan: '',
    mitarbeiter_kommentar: '',
  };
}

// --- Step 3: Individual card for one Mitarbeiter ---
interface BeurteilungsCardProps {
  mitarbeiter: Mitarbeitende;
  stelleName: string;
  form: BeurteilungsForm;
  onChange: (updated: BeurteilungsForm) => void;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}

function BeurteilungsCard({ mitarbeiter, stelleName, form, onChange, saved, saving, onSave }: BeurteilungsCardProps) {
  const [expanded, setExpanded] = useState(true);
  const name = [mitarbeiter.fields.vorname, mitarbeiter.fields.nachname].filter(Boolean).join(' ');

  const canSave = form.beurteilungsdatum && form.beurteiler_vorname && form.beurteiler_nachname && form.gesamtbewertungKey && form.beurteilungszeitraum;

  return (
    <div className={`rounded-2xl border overflow-hidden ${saved ? 'border-green-400 bg-green-50 dark:bg-green-950/20' : 'bg-card'}`}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <IconUser size={18} className="text-primary" stroke={1.5} />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{name || mitarbeiter.record_id}</p>
            {stelleName && <p className="text-xs text-muted-foreground truncate">{stelleName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && (
            <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
              <IconCheck size={12} stroke={2} className="mr-1" />
              {tx('Gespeichert')}
            </Badge>
          )}
          {expanded ? <IconChevronUp size={18} stroke={1.5} className="text-muted-foreground" /> : <IconChevronDown size={18} stroke={1.5} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Form body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {/* Beurteilungszeitraum */}
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Beurteilungszeitraum')} *</label>
              <Select value={form.beurteilungszeitraum} onValueChange={v => onChange({ ...form, beurteilungszeitraum: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZEITRAUM_OPTIONS.map(o => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Beurteilungsdatum */}
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Beurteilungsdatum')} *</label>
              <Input
                type="date"
                value={form.beurteilungsdatum}
                onChange={e => onChange({ ...form, beurteilungsdatum: e.target.value })}
              />
            </div>

            {/* Beurteiler Vorname */}
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Beurteiler Vorname')} *</label>
              <Input
                value={form.beurteiler_vorname}
                onChange={e => onChange({ ...form, beurteiler_vorname: e.target.value })}
                placeholder={tx('Vorname')}
              />
            </div>

            {/* Beurteiler Nachname */}
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Beurteiler Nachname')} *</label>
              <Input
                value={form.beurteiler_nachname}
                onChange={e => onChange({ ...form, beurteiler_nachname: e.target.value })}
                placeholder={tx('Nachname')}
              />
            </div>

            {/* Gesamtbewertung */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">{tx('Gesamtbewertung')} *</label>
              <Select value={form.gesamtbewertungKey} onValueChange={v => onChange({ ...form, gesamtbewertungKey: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEWERTUNG_OPTIONS.map(o => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Textarea fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Ziele erreicht')}</label>
              <Textarea rows={2} value={form.ziele_erreicht} onChange={e => onChange({ ...form, ziele_erreicht: e.target.value })} placeholder={tx('Welche Ziele wurden erreicht?')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Stärken')}</label>
              <Textarea rows={2} value={form.staerken} onChange={e => onChange({ ...form, staerken: e.target.value })} placeholder={tx('Besondere Stärken')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Verbesserungsbereiche')}</label>
              <Textarea rows={2} value={form.verbesserungsbereiche} onChange={e => onChange({ ...form, verbesserungsbereiche: e.target.value })} placeholder={tx('Wo besteht Entwicklungspotenzial?')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Entwicklungsplan')}</label>
              <Textarea rows={2} value={form.entwicklungsplan} onChange={e => onChange({ ...form, entwicklungsplan: e.target.value })} placeholder={tx('Konkrete Maßnahmen und Ziele')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{tx('Mitarbeiter-Kommentar')}</label>
              <Textarea rows={2} value={form.mitarbeiter_kommentar} onChange={e => onChange({ ...form, mitarbeiter_kommentar: e.target.value })} placeholder={tx('Rückmeldung des Mitarbeiters')} />
            </div>
          </div>

          {!saved && (
            <Button
              className="w-full sm:w-auto"
              disabled={!canSave || saving}
              onClick={onSave}
            >
              {saving ? tx('Wird gespeichert…') : tx('Beurteilung speichern')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function LeistungsbeurteilungsrundePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { abteilungen, mitarbeitende, stellen, stellenMap, loading, error, fetchAll } = useDashboardData();

  // Step state — shell handles URL ?step=N, we read it for initial value
  const initialStep = parseInt(searchParams.get('step') ?? '1', 10);
  const [step, setStep] = useState<number>(isNaN(initialStep) || initialStep < 1 || initialStep > 4 ? 1 : initialStep);

  // Step 1: selected Abteilung
  const abteilungIdParam = searchParams.get('abteilungId');
  const [selectedAbteilung, setSelectedAbteilung] = useState<Abteilungen | null>(() => null);

  // Step 2: selected Mitarbeitende (Set of record_ids)
  const [selectedMitarbeiterIds, setSelectedMitarbeiterIds] = useState<Set<string>>(new Set());

  // Step 3: per-Mitarbeiter form data
  const [forms, setForms] = useState<Record<string, BeurteilungsForm>>({});
  // Track saved state per Mitarbeiter and saving state
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [saveResults, setSaveResults] = useState<SavedResult[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Resolve abteilungId deep-link param
  const resolvedAbteilung = selectedAbteilung ?? (abteilungIdParam ? abteilungen.find(a => a.record_id === abteilungIdParam) ?? null : null);

  // Mitarbeitende filtered to selected Abteilung
  const filteredMitarbeitende = resolvedAbteilung
    ? mitarbeitende.filter(m => extractRecordId(m.fields.abteilung ?? '') === resolvedAbteilung.record_id)
    : [];

  const selectedMitarbeiterList = filteredMitarbeitende.filter(m => selectedMitarbeiterIds.has(m.record_id));

  // Helper: get stelle name for a Mitarbeiter
  const getStelleName = useCallback((m: Mitarbeitende): string => {
    const stelleId = extractRecordId(m.fields.stelle ?? '') ?? '';
    return stellenMap.get(stelleId)?.fields.stellenbezeichnung ?? '';
  }, [stellenMap]);

  // --- Step handlers ---
  const handleAbteilungSelect = (id: string) => {
    const abt = abteilungen.find(a => a.record_id === id) ?? null;
    setSelectedAbteilung(abt);
    setSelectedMitarbeiterIds(new Set());
    setForms({});
    setSavedIds(new Set());
    setSaveResults([]);
    const params = new URLSearchParams(searchParams);
    params.set('abteilungId', id);
    params.set('step', '2');
    setSearchParams(params);
    setStep(2);
  };

  const toggleMitarbeiter = (id: string) => {
    setSelectedMitarbeiterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedMitarbeiterIds.size === filteredMitarbeitende.length) {
      setSelectedMitarbeiterIds(new Set());
    } else {
      setSelectedMitarbeitende(new Set(filteredMitarbeitende.map(m => m.record_id)));
    }
  };

  // Fix: separate setter to avoid naming collision
  const setSelectedMitarbeitende = (ids: Set<string>) => setSelectedMitarbeiterIds(ids);

  const handleGoToStep3 = () => {
    if (selectedMitarbeiterIds.size === 0) return;
    // Initialize forms for newly selected Mitarbeiter
    const newForms: Record<string, BeurteilungsForm> = { ...forms };
    selectedMitarbeiterIds.forEach(id => {
      if (!newForms[id]) newForms[id] = makeDefaultForm();
    });
    setForms(newForms);
    const params = new URLSearchParams(searchParams);
    params.set('step', '3');
    setSearchParams(params);
    setStep(3);
  };

  const handleFormChange = (mitarbeiterId: string, updated: BeurteilungsForm) => {
    setForms(prev => ({ ...prev, [mitarbeiterId]: updated }));
  };

  const saveSingle = async (mitarbeiterId: string) => {
    const form = forms[mitarbeiterId];
    if (!form) return;
    setSavingIds(prev => new Set(prev).add(mitarbeiterId));
    try {
      await LivingAppsService.createLeistungsbeurteilungenEntry({
        mitarbeiter: createRecordUrl(APP_IDS.MITARBEITENDE, mitarbeiterId),
        beurteilungszeitraum: form.beurteilungszeitraum,
        beurteilungsdatum: form.beurteilungsdatum,
        beurteiler_vorname: form.beurteiler_vorname,
        beurteiler_nachname: form.beurteiler_nachname,
        gesamtbewertung: form.gesamtbewertungKey,
        ziele_erreicht: form.ziele_erreicht || undefined,
        staerken: form.staerken || undefined,
        verbesserungsbereiche: form.verbesserungsbereiche || undefined,
        entwicklungsplan: form.entwicklungsplan || undefined,
        mitarbeiter_kommentar: form.mitarbeiter_kommentar || undefined,
      });
      setSavedIds(prev => new Set(prev).add(mitarbeiterId));
      const m = mitarbeitende.find(x => x.record_id === mitarbeiterId);
      const name = [m?.fields.vorname, m?.fields.nachname].filter(Boolean).join(' ') || mitarbeiterId;
      const bewertungLabel = BEWERTUNG_OPTIONS.find(o => o.key === form.gesamtbewertungKey)?.label ?? form.gesamtbewertungKey;
      setSaveResults(prev => {
        if (prev.find(r => r.mitarbeiterId === mitarbeiterId)) return prev;
        return [...prev, { mitarbeiterId, name, gesamtbewertungLabel: bewertungLabel }];
      });
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(mitarbeiterId);
        return next;
      });
    }
  };

  const handleBulkSave = async () => {
    setBulkSaving(true);
    const unsaved = selectedMitarbeiterList.filter(m => !savedIds.has(m.record_id));
    await Promise.all(unsaved.map(m => saveSingle(m.record_id)));
    setBulkSaving(false);
  };

  const handleGoToSummary = () => {
    const params = new URLSearchParams(searchParams);
    params.set('step', '4');
    setSearchParams(params);
    setStep(4);
  };

  const handleReset = () => {
    setSelectedAbteilung(null);
    setSelectedMitarbeiterIds(new Set());
    setForms({});
    setSavedIds(new Set());
    setSaveResults([]);
    setBulkSaving(false);
    setSearchParams(new URLSearchParams());
    setStep(1);
  };

  const handleStepChange = (s: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(s));
    setSearchParams(params);
    setStep(s);
  };

  // Unused imports guard: stellen used in getStelleName only via stellenMap
  void stellen;

  const abteilungLabel = resolvedAbteilung?.fields.abteilungsname ?? '';
  const savedCount = savedIds.size;
  const totalCount = selectedMitarbeiterIds.size;

  return (
    <IntentWizardShell
      title={tx('Leistungsbeurteilungsrunde')}
      subtitle={abteilungLabel ? tx`Abteilung: ${abteilungLabel}` : tx('Abteilung wählen und Beurteilungen anlegen')}
      steps={[
        { label: tx('Abteilung') },
        { label: tx('Mitarbeitende') },
        { label: tx('Beurteilungen') },
        { label: tx('Abschluss') },
      ]}
      currentStep={step}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Abteilung wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={abteilungen.map(a => ({
            id: a.record_id,
            title: a.fields.abteilungsname ?? a.record_id,
            subtitle: [
              a.fields.abteilungscode,
              a.fields.standort,
              [a.fields.leiter_vorname, a.fields.leiter_nachname].filter(Boolean).join(' '),
            ].filter(Boolean).join(' · '),
            icon: <IconBuilding size={20} className="text-primary" stroke={1.5} />,
          }))}
          onSelect={handleAbteilungSelect}
          searchPlaceholder={tx('Abteilung suchen…')}
          emptyText={tx('Keine Abteilungen gefunden')}
        />
      )}

      {/* Step 2: Mitarbeitende auswählen */}
      {step === 2 && (
        resolvedAbteilung ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold">{tx('Mitarbeitende auswählen')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tx`Abteilung: ${resolvedAbteilung.fields.abteilungsname ?? ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {tx`${selectedMitarbeiterIds.size} Mitarbeitende ausgewählt`}
                </span>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedMitarbeiterIds.size === filteredMitarbeitende.length && filteredMitarbeitende.length > 0
                    ? tx('Alle abwählen')
                    : tx('Alle auswählen')}
                </Button>
              </div>
            </div>

            {filteredMitarbeitende.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <IconUsers size={40} stroke={1.2} className="mx-auto mb-3 opacity-40" />
                <p>{tx('Keine Mitarbeitenden in dieser Abteilung')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMitarbeitende.map(m => {
                  const selected = selectedMitarbeiterIds.has(m.record_id);
                  const name = [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || m.record_id;
                  const stelleName = getStelleName(m);
                  const beschaeftigungLabel = m.fields.beschaeftigungsart?.label ?? '';
                  return (
                    <button
                      key={m.record_id}
                      type="button"
                      onClick={() => toggleMitarbeiter(m.record_id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-secondary/50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {selected && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <IconUser size={16} stroke={1.5} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[stelleName, beschaeftigungLabel].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Zurück')}
              </Button>
              <Button
                disabled={selectedMitarbeiterIds.size === 0}
                onClick={handleGoToStep3}
              >
                {tx`${selectedMitarbeiterIds.size} Mitarbeitende beurteilen`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Bitte zuerst eine Abteilung wählen.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Zur Abteilungsauswahl')}</Button>
          </div>
        )
      )}

      {/* Step 3: Beurteilungen erfassen */}
      {step === 3 && (
        selectedMitarbeiterList.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold">{tx('Beurteilungen erfassen')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tx`${savedCount} / ${totalCount} Beurteilungen gespeichert`}
                </p>
              </div>
              {savedCount < totalCount && (
                <Button
                  onClick={handleBulkSave}
                  disabled={bulkSaving}
                  variant="outline"
                >
                  {bulkSaving ? tx('Wird gespeichert…') : tx('Alle gleichzeitig speichern')}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {selectedMitarbeiterList.map(m => (
                <BeurteilungsCard
                  key={m.record_id}
                  mitarbeiter={m}
                  stelleName={getStelleName(m)}
                  form={forms[m.record_id] ?? makeDefaultForm()}
                  onChange={updated => handleFormChange(m.record_id, updated)}
                  saved={savedIds.has(m.record_id)}
                  saving={savingIds.has(m.record_id)}
                  onSave={() => saveSingle(m.record_id)}
                />
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                {tx('Zurück')}
              </Button>
              <Button
                disabled={savedCount === 0}
                onClick={handleGoToSummary}
              >
                {savedCount === totalCount
                  ? tx('Zur Zusammenfassung')
                  : tx`Zusammenfassung (${savedCount} gespeichert)`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Bitte zuerst Mitarbeitende auswählen.')}</p>
            <Button variant="outline" onClick={() => setStep(2)}>{tx('Zur Mitarbeiterauswahl')}</Button>
          </div>
        )
      )}

      {/* Step 4: Zusammenfassung */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <IconCheck size={20} stroke={2} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">{tx('Beurteilungsrunde abgeschlossen')}</h3>
                <p className="text-sm text-muted-foreground">
                  {resolvedAbteilung?.fields.abteilungsname ?? ''}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <p className="text-3xl font-bold text-primary">{savedCount}</p>
              <p className="text-sm text-muted-foreground">{tx('Beurteilungen erstellt')}</p>
            </div>

            {saveResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{tx('Übersicht')}</h4>
                <div className="space-y-1">
                  {saveResults.map(r => (
                    <div key={r.mitarbeiterId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <IconUser size={14} stroke={1.5} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{r.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                        {r.gesamtbewertungLabel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
              {tx('Neue Runde starten')}
            </Button>
            <a href="#/" className="w-full sm:w-auto">
              <Button className="w-full">{tx('Zurück zum Dashboard')}</Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
