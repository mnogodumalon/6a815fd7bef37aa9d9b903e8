/**
 * Mitarbeiter Onboarding — 4-Schritt-Wizard.
 * Steps: 1) Stelle wählen → 2) Mitarbeiter anlegen → 3) Urlaub erfassen (optional) → 4) Zusammenfassung.
 * Reads: stellen, abteilungen. Writes: mitarbeitende (createMitarbeitendeEntry), abwesenheiten (createAbwesenheitenEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconUserPlus, IconBriefcase, IconCalendarOff, IconCircleCheck } from '@tabler/icons-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Stellen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { tx } from '@/i18n';

const BESCHAEFTIGUNGSART_OPTIONS = LOOKUP_OPTIONS['mitarbeitende']?.['beschaeftigungsart'] ?? [];
const GESCHLECHT_OPTIONS = LOOKUP_OPTIONS['mitarbeitende']?.['geschlecht'] ?? [];

export default function MitarbeiterOnboardingPage() {
  const { stellen, loading, error, fetchAll } = useDashboardData();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStep = parseInt(searchParams.get('step') ?? '1', 10);
  const initialStelleId = searchParams.get('stelleId') ?? '';
  const initialMitarbeiterId = searchParams.get('mitarbeiterId') ?? '';

  const [step, setStep] = useState(initialStep >= 1 && initialStep <= 4 ? initialStep : 1);
  const [selectedStelleId, setSelectedStelleId] = useState(initialStelleId);
  const [newMitarbeiterId, setNewMitarbeiterId] = useState(initialMitarbeiterId);
  const [newMitarbeiterName, setNewMitarbeiterName] = useState('');
  const [createdAbwesenheitId, setCreatedAbwesenheitId] = useState('');

  // Mitarbeiter form state
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [eintrittsdatum, setEintrittsdatum] = useState('');
  const [beschaeftigungsartKey, setBeschaeftigungsartKey] = useState('');
  const [geschlechtKey, setGeschlechtKey] = useState('none');
  const [personalnummer, setPersonalnummer] = useState('');
  const [mitarbeiterError, setMitarbeiterError] = useState('');
  const [mitarbeiterSubmitting, setMitarbeiterSubmitting] = useState(false);

  // Urlaub form state
  const [urlaubStartdatum, setUrlaubStartdatum] = useState('');
  const [urlaubEnddatum, setUrlaubEnddatum] = useState('');
  const [urlaubGrund, setUrlaubGrund] = useState('');
  const [urlaubError, setUrlaubError] = useState('');
  const [urlaubSubmitting, setUrlaubSubmitting] = useState(false);

  // Computed: Urlaub Anzahl Tage
  const urlaubAnzahlTage =
    urlaubStartdatum && urlaubEnddatum
      ? Math.max(0, differenceInDays(parseISO(urlaubEnddatum), parseISO(urlaubStartdatum)) + 1)
      : 0;

  // Prefill beschaeftigungsart from selected Stelle
  useEffect(() => {
    if (selectedStelleId && stellen.length > 0) {
      const stelle = stellen.find((s) => s.record_id === selectedStelleId);
      if (stelle?.fields.beschaeftigungsart?.key) {
        setBeschaeftigungsartKey(stelle.fields.beschaeftigungsart.key);
      }
    }
  }, [selectedStelleId, stellen]);

  // Sync step with URL
  const goToStep = (s: number) => {
    setStep(s);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', String(s));
      return next;
    });
  };

  const selectedStelle: Stellen | undefined = stellen.find((s) => s.record_id === selectedStelleId);

  const handleSelectStelle = (id: string) => {
    setSelectedStelleId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('stelleId', id);
      next.set('step', '2');
      return next;
    });
    setStep(2);
  };

  const handleMitarbeiterAnlegen = async () => {
    if (!vorname || !nachname || !email || !eintrittsdatum || !beschaeftigungsartKey) {
      setMitarbeiterError(tx('Bitte alle Pflichtfelder ausfüllen.'));
      return;
    }
    setMitarbeiterError('');
    setMitarbeiterSubmitting(true);
    try {
      let mid = newMitarbeiterId;
      if (!mid) {
        const abteilungId = selectedStelle
          ? extractRecordId(selectedStelle.fields.abteilung)
          : null;

        const payload: Record<string, unknown> = {
          vorname,
          nachname,
          email,
          eintrittsdatum,
          beschaeftigungsart: beschaeftigungsartKey,
        };
        if (telefon) payload.telefon = telefon;
        if (personalnummer) payload.personalnummer = personalnummer;
        if (geschlechtKey && geschlechtKey !== 'none') payload.geschlecht = geschlechtKey;
        if (abteilungId) {
          payload.abteilung = createRecordUrl(APP_IDS.ABTEILUNGEN, abteilungId);
        }
        if (selectedStelleId) {
          payload.stelle = createRecordUrl(APP_IDS.STELLEN, selectedStelleId);
        }

        const result = await LivingAppsService.createMitarbeitendeEntry(payload);
        mid = result.record_id;
        setNewMitarbeiterId(mid);
        setNewMitarbeiterName(`${vorname} ${nachname}`);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('mitarbeiterId', mid);
          next.set('step', '3');
          return next;
        });
      }
      await fetchAll();
      goToStep(3);
    } catch {
      setMitarbeiterError(tx('Fehler beim Anlegen des Mitarbeiters. Bitte erneut versuchen.'));
    } finally {
      setMitarbeiterSubmitting(false);
    }
  };

  const handleUrlaubErfassen = async () => {
    if (!urlaubStartdatum || !urlaubEnddatum) {
      setUrlaubError(tx('Bitte Start- und Enddatum angeben.'));
      return;
    }
    setUrlaubError('');
    setUrlaubSubmitting(true);
    try {
      let abwId = createdAbwesenheitId;
      if (!abwId) {
        const payload: Record<string, unknown> = {
          startdatum: urlaubStartdatum,
          enddatum: urlaubEnddatum,
          abwesenheitstyp: 'urlaub',
          status: 'beantragt',
          mitarbeiter: createRecordUrl(APP_IDS.MITARBEITENDE, newMitarbeiterId),
        };
        if (urlaubAnzahlTage > 0) payload.anzahl_tage = urlaubAnzahlTage;
        if (urlaubGrund) payload.grund = urlaubGrund;

        const result = await LivingAppsService.createAbwesenheitenEntry(payload);
        abwId = result.record_id;
        setCreatedAbwesenheitId(abwId);
      }
      await fetchAll();
      goToStep(4);
    } catch {
      setUrlaubError(tx('Fehler beim Anlegen des Urlaubsantrags. Bitte erneut versuchen.'));
    } finally {
      setUrlaubSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedStelleId('');
    setNewMitarbeiterId('');
    setNewMitarbeiterName('');
    setCreatedAbwesenheitId('');
    setVorname('');
    setNachname('');
    setEmail('');
    setTelefon('');
    setEintrittsdatum('');
    setBeschaeftigungsartKey('');
    setGeschlechtKey('none');
    setPersonalnummer('');
    setUrlaubStartdatum('');
    setUrlaubEnddatum('');
    setUrlaubGrund('');
    setMitarbeiterError('');
    setUrlaubError('');
    setSearchParams({});
    setStep(1);
  };

  const wizardSteps = [
    { label: tx('Stelle') },
    { label: tx('Mitarbeiter') },
    { label: tx('Urlaub') },
    { label: tx('Fertig') },
  ];

  return (
    <IntentWizardShell
      title={tx('Mitarbeiter Onboarding')}
      subtitle={tx('Neuen Mitarbeiter in 3 Schritten onboarden')}
      steps={wizardSteps}
      currentStep={step}
      onStepChange={goToStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Stelle wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={stellen.map((s) => ({
            id: s.record_id,
            title: s.fields.stellenbezeichnung ?? tx('Unbenannte Stelle'),
            subtitle: [
              s.fields.stellencode,
              s.fields.beschaeftigungsart?.label,
              s.fields.senioritaet?.label,
            ]
              .filter(Boolean)
              .join(' · '),
            icon: <IconBriefcase size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectStelle}
          searchPlaceholder={tx('Stelle suchen …')}
          emptyText={tx('Keine Stellen gefunden')}
          emptyIcon={<IconBriefcase size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Mitarbeiter anlegen */}
      {step === 2 && (
        selectedStelle ? (
          <div className="space-y-6">
            {/* Context card */}
            <div className="rounded-2xl border bg-secondary p-4 flex items-center gap-3">
              <IconBriefcase size={20} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedStelle.fields.stellenbezeichnung}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[selectedStelle.fields.stellencode, selectedStelle.fields.beschaeftigungsart?.label]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => goToStep(1)}>
                {tx('Ändern')}
              </Button>
            </div>

            {/* Mini-form */}
            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <IconUserPlus size={18} className="text-primary" />
                <h3 className="font-semibold text-sm">{tx('Mitarbeiterdaten')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{tx('Vorname')} *</label>
                  <Input
                    value={vorname}
                    onChange={(e) => setVorname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{tx('Nachname')} *</label>
                  <Input
                    value={nachname}
                    onChange={(e) => setNachname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{tx('E-Mail')} *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tx('max.mustermann@firma.de')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{tx('Telefon')}</label>
                <Input
                  type="tel"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  placeholder="+49 …"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{tx('Eintrittsdatum')} *</label>
                <Input
                  type="date"
                  value={eintrittsdatum}
                  onChange={(e) => setEintrittsdatum(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{tx('Beschäftigungsart')} *</label>
                  <Select value={beschaeftigungsartKey} onValueChange={setBeschaeftigungsartKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tx('Bitte wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {BESCHAEFTIGUNGSART_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{tx('Geschlecht')}</label>
                  <Select value={geschlechtKey} onValueChange={setGeschlechtKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tx('Keine Angabe')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Keine Angabe')}</SelectItem>
                      {GESCHLECHT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{tx('Personalnummer')}</label>
                <Input
                  value={personalnummer}
                  onChange={(e) => setPersonalnummer(e.target.value)}
                  placeholder={tx('z. B. MA-2026-001')}
                />
              </div>
            </div>

            {mitarbeiterError && (
              <p className="text-sm text-destructive">{mitarbeiterError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => goToStep(1)} className="sm:w-auto w-full">
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleMitarbeiterAnlegen}
                disabled={mitarbeiterSubmitting || !vorname || !nachname || !email || !eintrittsdatum || !beschaeftigungsartKey}
                className="sm:w-auto w-full"
              >
                {mitarbeiterSubmitting ? tx('Wird angelegt …') : tx('Mitarbeiter anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt benötigt eine ausgewählte Stelle aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => goToStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* Step 3: Urlaub erfassen (optional) */}
      {step === 3 && (
        newMitarbeiterId ? (
          <div className="space-y-6">
            {/* Context card */}
            <div className="rounded-2xl border bg-secondary p-4 flex items-center gap-3">
              <IconUserPlus size={20} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{newMitarbeiterName || tx('Neuer Mitarbeiter')}</p>
                {eintrittsdatum && (
                  <p className="text-xs text-muted-foreground">{tx('Eintritt:')} {eintrittsdatum}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <IconCalendarOff size={18} className="text-primary" />
                <h3 className="font-semibold text-sm">{tx('Initialer Urlaubsantrag (optional)')}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{tx('Du kannst diesen Schritt überspringen und den Urlaub später erfassen.')}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{tx('Startdatum')} *</label>
                  <Input
                    type="date"
                    value={urlaubStartdatum}
                    onChange={(e) => setUrlaubStartdatum(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{tx('Enddatum')} *</label>
                  <Input
                    type="date"
                    value={urlaubEnddatum}
                    onChange={(e) => setUrlaubEnddatum(e.target.value)}
                    min={urlaubStartdatum || undefined}
                  />
                </div>
              </div>

              {urlaubStartdatum && urlaubEnddatum && urlaubAnzahlTage > 0 && (
                <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  {tx('Anzahl Tage:')} <span className="font-semibold text-foreground">{urlaubAnzahlTage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{tx('Grund')}</label>
                <Input
                  value={urlaubGrund}
                  onChange={(e) => setUrlaubGrund(e.target.value)}
                  placeholder={tx('z. B. Jahresurlaub')}
                />
              </div>
            </div>

            {urlaubError && (
              <p className="text-sm text-destructive">{urlaubError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep(4)}
                className="sm:w-auto w-full"
              >
                {tx('Überspringen')}
              </Button>
              <Button
                onClick={handleUrlaubErfassen}
                disabled={urlaubSubmitting || !urlaubStartdatum || !urlaubEnddatum}
                className="sm:w-auto w-full"
              >
                {urlaubSubmitting ? tx('Wird gespeichert …') : tx('Urlaub beantragen & weiter')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt benötigt einen angelegten Mitarbeiter aus Schritt 2.')}</p>
            <Button variant="outline" onClick={() => goToStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* Step 4: Zusammenfassung */}
      {step === 4 && (
        newMitarbeiterId ? (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <IconCircleCheck size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{tx('Onboarding abgeschlossen')}</h3>
                  <p className="text-sm text-muted-foreground">{tx('Der neue Mitarbeiter wurde erfolgreich angelegt.')}</p>
                </div>
              </div>

              <div className="divide-y">
                <div className="py-3 grid grid-cols-2 gap-2">
                  <span className="text-sm text-muted-foreground">{tx('Name')}</span>
                  <span className="text-sm font-medium truncate">{newMitarbeiterName || `${vorname} ${nachname}`.trim()}</span>
                </div>
                {selectedStelle && (
                  <div className="py-3 grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">{tx('Stelle')}</span>
                    <span className="text-sm font-medium truncate">{selectedStelle.fields.stellenbezeichnung}</span>
                  </div>
                )}
                {eintrittsdatum && (
                  <div className="py-3 grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">{tx('Eintrittsdatum')}</span>
                    <span className="text-sm font-medium">{eintrittsdatum}</span>
                  </div>
                )}
                {beschaeftigungsartKey && (
                  <div className="py-3 grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">{tx('Beschäftigungsart')}</span>
                    <span className="text-sm font-medium">
                      {BESCHAEFTIGUNGSART_OPTIONS.find((o) => o.key === beschaeftigungsartKey)?.label ?? beschaeftigungsartKey}
                    </span>
                  </div>
                )}
                {createdAbwesenheitId && urlaubStartdatum && urlaubEnddatum && (
                  <div className="py-3 grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">{tx('Urlaub beantragt')}</span>
                    <span className="text-sm font-medium">
                      {urlaubStartdatum} – {urlaubEnddatum}
                      {urlaubAnzahlTage > 0 && ` (${urlaubAnzahlTage} ${tx('Tage')})`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleReset} className="sm:w-auto w-full">
                {tx('Weiteren Mitarbeiter onboarden')}
              </Button>
              <a href="#/" className="sm:w-auto w-full">
                <Button className="w-full">{tx('Zurück zum Dashboard')}</Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Kein Mitarbeiter gefunden. Bitte starte den Wizard neu.')}</p>
            <Button variant="outline" onClick={() => goToStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
