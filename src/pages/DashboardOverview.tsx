import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichStellen, enrichMitarbeitende, enrichAbwesenheiten, enrichLeistungsbeurteilungen } from '@/lib/enrich';
import type { EnrichedStellen, EnrichedMitarbeitende, EnrichedAbwesenheiten, EnrichedLeistungsbeurteilungen } from '@/types/enriched';
import type { Abteilungen, Stellen, Mitarbeitende, Abwesenheiten, Leistungsbeurteilungen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import {
  RecordOverlayHost,
  RecordHeader,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { AbteilungenDetails } from '@/components/details/AbteilungenDetails';
import { StellenDetails } from '@/components/details/StellenDetails';
import { MitarbeitendeDetails } from '@/components/details/MitarbeitendeDetails';
import { AbwesenheitenDetails } from '@/components/details/AbwesenheitenDetails';
import { LeistungsbeurteilungenDetails } from '@/components/details/LeistungsbeurteilungenDetails';
import { MitarbeitendeDialog } from '@/components/dialogs/MitarbeitendeDialog';
import { AbwesenheitenDialog } from '@/components/dialogs/AbwesenheitenDialog';
import { LeistungsbeurteilungenDialog } from '@/components/dialogs/LeistungsbeurteilungenDialog';
import { StellenDialog } from '@/components/dialogs/StellenDialog';
import { AbteilungenDialog } from '@/components/dialogs/AbteilungenDialog';
import type { MitarbeitendeDialogDefaults } from '@/components/dialogs/MitarbeitendeDialog';
import type { AbwesenheitenDialogDefaults } from '@/components/dialogs/AbwesenheitenDialog';
import type { LeistungsbeurteilungenDialogDefaults } from '@/components/dialogs/LeistungsbeurteilungenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import {
  IconUsers,
  IconUserPlus,
  IconCalendarOff,
  IconCheck,
  IconX,
  IconBuilding,
  IconBriefcase,
  IconClipboardList,
  IconAlertCircle,
  IconSearch,
} from '@tabler/icons-react';

export type OverlayItem =
  | { type: 'abteilungen'; record: Abteilungen }
  | { type: 'stellen'; record: EnrichedStellen }
  | { type: 'mitarbeitende'; record: EnrichedMitarbeitende }
  | { type: 'abwesenheiten'; record: EnrichedAbwesenheiten }
  | { type: 'leistungsbeurteilungen'; record: EnrichedLeistungsbeurteilungen };

export default function DashboardOverview() {
  const {
    abteilungen, stellen, mitarbeitende, abwesenheiten, leistungsbeurteilungen,
    abteilungenMap, stellenMap, mitarbeitendeMap,
    setAbwesenheiten,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();

  const enrichedStellen = useMemo(() => enrichStellen(stellen, { abteilungenMap }), [stellen, abteilungenMap]);
  const enrichedMitarbeitende = useMemo(() => enrichMitarbeitende(mitarbeitende, { abteilungenMap, stellenMap }), [mitarbeitende, abteilungenMap, stellenMap]);
  const enrichedAbwesenheiten = useMemo(() => enrichAbwesenheiten(abwesenheiten, { mitarbeitendeMap }), [abwesenheiten, mitarbeitendeMap]);
  const enrichedLeistungsbeurteilungen = useMemo(() => enrichLeistungsbeurteilungen(leistungsbeurteilungen, { mitarbeitendeMap }), [leistungsbeurteilungen, mitarbeitendeMap]);

  // Filter state
  const [abteilungFilter, setAbteilungFilter] = useState<string | null>(null);
  const [beschaeftigungFilter, setBeschaeftigungFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [mitarbDialogOpen, setMitarbDialogOpen] = useState(false);
  const [mitarbEditDefaults, setMitarbEditDefaults] = useState<MitarbeitendeDialogDefaults | undefined>();
  const [mitarbEditId, setMitarbEditId] = useState<string | undefined>();

  const [abwDialogOpen, setAbwDialogOpen] = useState(false);
  const [abwDefaults, setAbwDefaults] = useState<AbwesenheitenDialogDefaults | undefined>();
  const [abwEditId, setAbwEditId] = useState<string | undefined>();

  const [lbDialogOpen, setLbDialogOpen] = useState(false);
  const [lbDefaults, setLbDefaults] = useState<LeistungsbeurteilungenDialogDefaults | undefined>();
  const [lbEditId, setLbEditId] = useState<string | undefined>();

  const [stelleDialogOpen, setStelleDialogOpen] = useState(false);
  const [stelleEditId, setStelleEditId] = useState<string | undefined>();
  const [stelleAbteilungId, setStelleAbteilungId] = useState<string | undefined>();

  const [abtDialogOpen, setAbtDialogOpen] = useState(false);
  const [abtEditId, setAbtEditId] = useState<string | undefined>();

  // Overlay stack
  const overlay = useRecordOverlayStack<OverlayItem>();

  // Derived: pending absences
  const pendingAbwesenheiten = useMemo(
    () => enrichedAbwesenheiten.filter(a => a.fields.status?.key === 'beantragt'),
    [enrichedAbwesenheiten]
  );

  // Derived: today string for absence checks
  const today = format(clock, 'yyyy-MM-dd');

  // Active absences today
  const activeToday = useMemo(
    () => enrichedAbwesenheiten.filter(a => {
      const s = a.fields.startdatum ?? '';
      const e = a.fields.enddatum ?? '';
      return a.fields.status?.key === 'genehmigt' && s <= today && e >= today;
    }),
    [enrichedAbwesenheiten, today]
  );

  // Filtered Mitarbeitende
  const filteredMitarbeitende = useMemo(() => {
    let list = enrichedMitarbeitende;
    if (abteilungFilter) {
      list = list.filter(m => extractRecordId(m.fields.abteilung) === abteilungFilter);
    }
    if (beschaeftigungFilter) {
      list = list.filter(m => m.fields.beschaeftigungsart?.key === beschaeftigungFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.toLowerCase().includes(q) ||
        (m.fields.email ?? '').toLowerCase().includes(q) ||
        (m.abteilungName ?? '').toLowerCase().includes(q) ||
        (m.stelleName ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrichedMitarbeitende, abteilungFilter, beschaeftigungFilter, searchQuery]);

  // Approve absence optimistically
  const approveAbwesenheit = useCallback(async (a: EnrichedAbwesenheiten) => {
    const prev = [...abwesenheiten];
    setAbwesenheiten(abwesenheiten.map(x =>
      x.record_id === a.record_id
        ? { ...x, fields: { ...x.fields, status: lookupOption('abwesenheiten', 'status', 'genehmigt') } }
        : x
    ));
    undoToast(tx`${a.mitarbeiterName} — Abwesenheit genehmigt`, async () => {
      setAbwesenheiten(prev);
      await LivingAppsService.updateAbwesenheitenEntry(a.record_id, { status: 'beantragt' });
    });
    try {
      await LivingAppsService.updateAbwesenheitenEntry(a.record_id, { status: 'genehmigt' });
    } catch {
      setAbwesenheiten(prev);
      await fetchAll();
    }
  }, [abwesenheiten, setAbwesenheiten, fetchAll]);

  // Chart rows for absence types
  const abwChartRows = useMemo((): ChartRow<EnrichedAbwesenheiten>[] =>
    enrichedAbwesenheiten.map(a => ({ id: `abwesenheiten:${a.record_id}`, data: a })),
    [enrichedAbwesenheiten]
  );

  // Beschäftigungsart options (inside component body — locale-aware)
  const beschaeftigungsartOptions = LOOKUP_OPTIONS['mitarbeitende']?.['beschaeftigungsart'] ?? [];

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Context line
  const activeTodayNames = namen(activeToday.map(a => a.mitarbeiterName));
  const contextLine = activeToday.length > 0
    ? tx`${gruss(clock)} Heute abwesend: ${activeTodayNames}.`
    : pendingAbwesenheiten.length > 0
      ? tx`${gruss(clock)} ${String(pendingAbwesenheiten.length)} Abwesenheitsanträge warten auf Genehmigung.`
      : tx`${gruss(clock)} Alle ${String(mitarbeitende.length)} Mitarbeitenden im Überblick.`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {tx('HR-Dashboard')}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{contextLine}</p>
        </div>
        <button
          onClick={() => { setMitarbEditDefaults(undefined); setMitarbEditId(undefined); setMitarbDialogOpen(true); }}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconUserPlus size={16} className="shrink-0" />
          {tx('Mitarbeiter:in anlegen')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={pendingAbwesenheiten.length > 0 && (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Genehmigen'),
              onClick: () => approveAbwesenheit(pendingAbwesenheiten[0]),
            }}
          >
            <b>{namen(pendingAbwesenheiten.map(a => a.mitarbeiterName))}</b>
            {' '}{pendingAbwesenheiten.length === 1
              ? tx('hat einen offenen Abwesenheitsantrag.')
              : tx('haben offene Abwesenheitsanträge.')}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={appLabel('mitarbeitende')}
              value={mitarbeitende.length}
              icon={<IconUsers size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={appLabel('abteilungen')}
              value={abteilungen.length}
              icon={<IconBuilding size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={appLabel('stellen')}
              value={stellen.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Heute abwesend')}
              value={activeToday.length}
              icon={<IconCalendarOff size={16} className="shrink-0" />}
              tone={activeToday.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Offen zur Genehmigung')}
              value={pendingAbwesenheiten.length}
              icon={<IconClipboardList size={16} className="shrink-0" />}
              tone={pendingAbwesenheiten.length > 0 ? 'destructive' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={tx('Name, E-Mail, Abteilung …')}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Abteilung filter chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setAbteilungFilter(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    abteilungFilter === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tx('Alle')}
                </button>
                {abteilungen.map(a => (
                  <button
                    key={a.record_id}
                    onClick={() => setAbteilungFilter(f => f === a.record_id ? null : a.record_id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      abteilungFilter === a.record_id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {a.fields.abteilungsname ?? appLabel('abteilungen')}
                  </button>
                ))}
              </div>
              {/* Beschäftigungsart filter */}
              <div className="flex flex-wrap gap-1.5">
                {beschaeftigungsartOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setBeschaeftigungFilter(f => f === opt.key ? null : opt.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      beschaeftigungFilter === opt.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mitarbeitende grid */}
            {mitarbeitende.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-border">
                <IconUsers size={48} className="text-muted-foreground" />
                <p className="text-muted-foreground text-sm">{tx('Noch keine Mitarbeitenden angelegt.')}</p>
                <button
                  onClick={() => { setMitarbEditDefaults(undefined); setMitarbEditId(undefined); setMitarbDialogOpen(true); }}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <IconUserPlus size={16} className="shrink-0" />
                  {tx('Erste:n Mitarbeiter:in anlegen')}
                </button>
              </div>
            ) : filteredMitarbeitende.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 rounded-xl border border-dashed border-border">
                <IconSearch size={32} className="text-muted-foreground" />
                <p className="text-muted-foreground text-sm">{tx('Keine Mitarbeitenden gefunden.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredMitarbeitende.map(m => {
                  const abwCount = abwesenheiten.filter(a => extractRecordId(a.fields.mitarbeiter) === m.record_id && a.fields.status?.key === 'genehmigt').length;
                  const isAbsentToday = activeToday.some(a => extractRecordId(a.fields.mitarbeiter) === m.record_id);
                  return (
                    <button
                      key={m.record_id}
                      onClick={() => overlay.replace({ type: 'mitarbeitende', record: m })}
                      className="text-left rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {m.fields.profilbild ? (
                            <img src={m.fields.profilbild as string} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {(m.fields.vorname?.[0] ?? '').toUpperCase()}{(m.fields.nachname?.[0] ?? '').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate text-foreground">
                            {m.fields.vorname} {m.fields.nachname}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{m.stelleName || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.abteilungName || '—'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {m.fields.beschaeftigungsart && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {m.fields.beschaeftigungsart.label}
                          </span>
                        )}
                        {isAbsentToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning-foreground font-medium">
                            {tx('Abwesend')}
                          </span>
                        )}
                        {abwCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {abwCount} {tx('Abw.')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        }
        aside={
          <>
            <WorkList
              title={tx('Abwesenheitsanträge')}
              items={pendingAbwesenheiten.slice(0, 8).map(a => ({
                id: a.record_id,
                title: a.mitarbeiterName || tx('Unbekannt'),
                secondLine: (
                  <>
                    <span className="font-medium text-warning">{a.fields.abwesenheitstyp?.label ?? '—'}</span>
                    <span className="text-muted-foreground"> · {formatDate(a.fields.startdatum)} – {formatDate(a.fields.enddatum)}</span>
                  </>
                ),
                action: {
                  label: tx('Genehmigen'),
                  onClick: () => approveAbwesenheit(a),
                },
              }))}
              onItemClick={id => {
                const found = enrichedAbwesenheiten.find(a => a.record_id === id);
                if (found) overlay.replace({ type: 'abwesenheiten', record: found });
              }}
              empty={{
                text: tx('Keine offenen Anträge — alles genehmigt.'),
                action: {
                  label: tx('Abwesenheit erfassen'),
                  onClick: () => { setAbwDefaults(undefined); setAbwEditId(undefined); setAbwDialogOpen(true); },
                },
              }}
            />
            <ChartWidget
              title={tx('Abwesenheitstypen')}
              rows={abwChartRows}
              dimension={{
                kind: 'category',
                accessor: row => row.data.fields.abwesenheitstyp,
                label: tx('Typ'),
              }}
            />
          </>
        }
      />

      {/* Dialogs */}
      <MitarbeitendeDialog
        open={mitarbDialogOpen}
        onClose={() => setMitarbDialogOpen(false)}
        onSubmit={async fields => {
          if (mitarbEditId) {
            await LivingAppsService.updateMitarbeitendeEntry(mitarbEditId, fields);
          } else {
            await LivingAppsService.createMitarbeitendeEntry(fields);
          }
          await fetchAll();
        }}
        defaultValues={mitarbEditDefaults}
        recordId={mitarbEditId}
        abteilungenList={abteilungen}
        stellenList={stellen}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeitende']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeitende']}
      />

      <AbwesenheitenDialog
        open={abwDialogOpen}
        onClose={() => setAbwDialogOpen(false)}
        onSubmit={async fields => {
          if (abwEditId) {
            await LivingAppsService.updateAbwesenheitenEntry(abwEditId, fields);
          } else {
            await LivingAppsService.createAbwesenheitenEntry(fields);
          }
          await fetchAll();
        }}
        defaultValues={abwDefaults}
        recordId={abwEditId}
        mitarbeitendeList={mitarbeitende}
        enablePhotoScan={AI_PHOTO_SCAN['Abwesenheiten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Abwesenheiten']}
      />

      <LeistungsbeurteilungenDialog
        open={lbDialogOpen}
        onClose={() => setLbDialogOpen(false)}
        onSubmit={async fields => {
          if (lbEditId) {
            await LivingAppsService.updateLeistungsbeurteilungenEntry(lbEditId, fields);
          } else {
            await LivingAppsService.createLeistungsbeurteilungenEntry(fields);
          }
          await fetchAll();
        }}
        defaultValues={lbDefaults}
        recordId={lbEditId}
        mitarbeitendeList={mitarbeitende}
        enablePhotoScan={AI_PHOTO_SCAN['Leistungsbeurteilungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leistungsbeurteilungen']}
      />

      <StellenDialog
        open={stelleDialogOpen}
        onClose={() => setStelleDialogOpen(false)}
        onSubmit={async fields => {
          if (stelleEditId) {
            await LivingAppsService.updateStellenEntry(stelleEditId, fields);
          } else {
            await LivingAppsService.createStellenEntry(fields);
          }
          await fetchAll();
        }}
        defaultValues={stelleAbteilungId ? { abteilung: stelleAbteilungId } : undefined}
        recordId={stelleEditId}
        abteilungenList={abteilungen}
        enablePhotoScan={AI_PHOTO_SCAN['Stellen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Stellen']}
      />

      <AbteilungenDialog
        open={abtDialogOpen}
        onClose={() => setAbtDialogOpen(false)}
        onSubmit={async fields => {
          if (abtEditId) {
            await LivingAppsService.updateAbteilungenEntry(abtEditId, fields);
          } else {
            await LivingAppsService.createAbteilungenEntry(fields);
          }
          await fetchAll();
        }}
        recordId={abtEditId}
        enablePhotoScan={AI_PHOTO_SCAN['Abteilungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Abteilungen']}
      />

      {/* Overlay host */}
      <RecordOverlayHost
        overlay={overlay}
        render={top => {
          if (top.type === 'abteilungen') {
            return (
              <>
                <RecordHeader
                  title={top.record.fields.abteilungsname ?? appLabel('abteilungen')}
                  subtitle={top.record.fields.abteilungscode}
                  badges={<span className="text-xs text-muted-foreground">{top.record.fields.standort}</span>}
                />
                <AbteilungenDetails
                  record={top.record}
                  stellenList={stellen}
                  onOpenStellen={r => overlay.push({ type: 'stellen', record: enrichedStellen.find(s => s.record_id === r.record_id) ?? enrichStellen([r], { abteilungenMap })[0] })}
                  onAddStellen={() => { setStelleAbteilungId(top.record.record_id); setStelleEditId(undefined); setStelleDialogOpen(true); }}
                  mitarbeitendeList={mitarbeitende}
                  onOpenMitarbeitende={r => overlay.push({ type: 'mitarbeitende', record: enrichedMitarbeitende.find(m => m.record_id === r.record_id) ?? enrichMitarbeitende([r], { abteilungenMap, stellenMap })[0] })}
                  onAddMitarbeitende={() => { setMitarbEditDefaults({ abteilung: top.record.record_id }); setMitarbEditId(undefined); setMitarbDialogOpen(true); }}
                />
              </>
            );
          }
          if (top.type === 'stellen') {
            return (
              <>
                <RecordHeader
                  title={top.record.fields.stellenbezeichnung ?? appLabel('stellen')}
                  subtitle={top.record.abteilungName || top.record.fields.stellencode}
                  badges={top.record.fields.beschaeftigungsart && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {top.record.fields.beschaeftigungsart.label}
                    </span>
                  )}
                />
                <StellenDetails
                  record={top.record}
                  abteilungenList={abteilungen}
                  onOpenAbteilungen={r => overlay.push({ type: 'abteilungen', record: r })}
                  mitarbeitendeList={mitarbeitende}
                  onOpenMitarbeitende={r => overlay.push({ type: 'mitarbeitende', record: enrichedMitarbeitende.find(m => m.record_id === r.record_id) ?? enrichMitarbeitende([r], { abteilungenMap, stellenMap })[0] })}
                  onAddMitarbeitende={() => { setMitarbEditDefaults({ stelle: top.record.record_id }); setMitarbEditId(undefined); setMitarbDialogOpen(true); }}
                />
              </>
            );
          }
          if (top.type === 'mitarbeitende') {
            return (
              <>
                <RecordHeader
                  title={`${top.record.fields.vorname ?? ''} ${top.record.fields.nachname ?? ''}`.trim() || appLabel('mitarbeitende')}
                  subtitle={top.record.stelleName || top.record.abteilungName}
                  badges={top.record.fields.beschaeftigungsart && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {top.record.fields.beschaeftigungsart.label}
                    </span>
                  )}
                />
                <MitarbeitendeDetails
                  record={top.record}
                  abteilungenList={abteilungen}
                  onOpenAbteilungen={r => overlay.push({ type: 'abteilungen', record: r })}
                  stellenList={stellen}
                  onOpenStellen={r => overlay.push({ type: 'stellen', record: enrichedStellen.find(s => s.record_id === r.record_id) ?? enrichStellen([r], { abteilungenMap })[0] })}
                  abwesenheitenList={abwesenheiten}
                  onOpenAbwesenheiten={r => overlay.push({ type: 'abwesenheiten', record: enrichedAbwesenheiten.find(a => a.record_id === r.record_id) ?? enrichAbwesenheiten([r], { mitarbeitendeMap })[0] })}
                  onAddAbwesenheiten={() => { setAbwDefaults({ mitarbeiter: top.record.record_id }); setAbwEditId(undefined); setAbwDialogOpen(true); }}
                  leistungsbeurteilungenList={leistungsbeurteilungen}
                  onOpenLeistungsbeurteilungen={r => overlay.push({ type: 'leistungsbeurteilungen', record: enrichedLeistungsbeurteilungen.find(l => l.record_id === r.record_id) ?? enrichLeistungsbeurteilungen([r], { mitarbeitendeMap })[0] })}
                  onAddLeistungsbeurteilungen={() => { setLbDefaults({ mitarbeiter: top.record.record_id }); setLbEditId(undefined); setLbDialogOpen(true); }}
                />
              </>
            );
          }
          if (top.type === 'abwesenheiten') {
            return (
              <>
                <RecordHeader
                  title={top.record.mitarbeiterName || appLabel('abwesenheiten')}
                  subtitle={top.record.fields.abwesenheitstyp?.label}
                  badges={top.record.fields.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      top.record.fields.status.key === 'genehmigt' ? 'bg-success/10 text-success' :
                      top.record.fields.status.key === 'beantragt' ? 'bg-warning/10 text-warning' :
                      top.record.fields.status.key === 'abgelehnt' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {top.record.fields.status.label}
                    </span>
                  )}
                />
                <AbwesenheitenDetails
                  record={top.record}
                  mitarbeitendeList={mitarbeitende}
                  onOpenMitarbeitende={r => overlay.push({ type: 'mitarbeitende', record: enrichedMitarbeitende.find(m => m.record_id === r.record_id) ?? enrichMitarbeitende([r], { abteilungenMap, stellenMap })[0] })}
                />
              </>
            );
          }
          if (top.type === 'leistungsbeurteilungen') {
            return (
              <>
                <RecordHeader
                  title={top.record.mitarbeiterName || appLabel('leistungsbeurteilungen')}
                  subtitle={`${top.record.fields.beurteiler_vorname ?? ''} ${top.record.fields.beurteiler_nachname ?? ''}`.trim()}
                  badges={top.record.fields.gesamtbewertung && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {top.record.fields.gesamtbewertung.label}
                    </span>
                  )}
                />
                <LeistungsbeurteilungenDetails
                  record={top.record}
                  mitarbeitendeList={mitarbeitende}
                  onOpenMitarbeitende={r => overlay.push({ type: 'mitarbeitende', record: enrichedMitarbeitende.find(m => m.record_id === r.record_id) ?? enrichMitarbeitende([r], { abteilungenMap, stellenMap })[0] })}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={top => {
          if (top.type === 'mitarbeitende') {
            setMitarbEditDefaults(top.record.fields as MitarbeitendeDialogDefaults);
            setMitarbEditId(top.record.record_id);
            setMitarbDialogOpen(true);
          } else if (top.type === 'abwesenheiten') {
            setAbwDefaults(top.record.fields as AbwesenheitenDialogDefaults);
            setAbwEditId(top.record.record_id);
            setAbwDialogOpen(true);
          } else if (top.type === 'leistungsbeurteilungen') {
            setLbDefaults(top.record.fields as LeistungsbeurteilungenDialogDefaults);
            setLbEditId(top.record.record_id);
            setLbDialogOpen(true);
          } else if (top.type === 'stellen') {
            setStelleAbteilungId(undefined);
            setStelleEditId(top.record.record_id);
            setStelleDialogOpen(true);
          } else if (top.type === 'abteilungen') {
            setAbtEditId(top.record.record_id);
            setAbtDialogOpen(true);
          }
        }}
        footer={top => {
          if (top.type === 'abwesenheiten' && top.record.fields.status?.key === 'beantragt') {
            return {
              label: tx('Abwesenheit genehmigen'),
              onClick: () => {
                approveAbwesenheit(top.record as EnrichedAbwesenheiten);
                overlay.close();
              },
            };
          }
          return undefined;
        }}
      />
    </div>
  );
}
