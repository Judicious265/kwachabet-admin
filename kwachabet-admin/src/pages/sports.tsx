import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, SearchBar, TableSkeleton, EmptyState, Modal, StatCard, Pagination } from '../components/ui';
import { api, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const SPORTS = [
  { id: 'all',          label: 'All Sports',  emoji: '🏆' },
  { id: 'football',     label: 'Football',    emoji: '⚽' },
  { id: 'basketball',   label: 'Basketball',  emoji: '🏀' },
  { id: 'tennis',       label: 'Tennis',      emoji: '🎾' },
  { id: 'ice_hockey',   label: 'Ice Hockey',  emoji: '🏒' },
  { id: 'baseball',     label: 'Baseball',    emoji: '⚾' },
  { id: 'rugby_league', label: 'Rugby',       emoji: '🏉' },
];

const LOCAL_LEAGUES = [
  'TNM Super League', 'FAM Cup', 'Malawi National Basketball League',
  'COSAFA Cup', 'CAF Champions League', 'Community Tournament', 'Other',
];

const STATUS_OPTS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live',     label: 'Live' },
  { id: 'finished', label: 'Finished' },
  { id: 'all',      label: 'All' },
];

export default function SportsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [events, setEvents]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sport, setSport]             = useState('all');
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(1);
  const [totalCount, setTotalCount]   = useState(0);

  // Modals
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showOddsModal, setShowOddsModal]     = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);

  const [saving, setSaving] = useState(false);

  // Add match form
  const [newMatch, setNewMatch] = useState({
    home_team: '', away_team: '', league: 'TNM Super League',
    sport_id: 'football', commence_time: '',
    odds_home: '', odds_draw: '', odds_away: '',
  });

  // Edit odds form
  const [oddsEdit, setOddsEdit] = useState({ home: '', draw: '', away: '' });

  // Set result form
  const [resultForm, setResultForm] = useState({ home_score: '', away_score: '', result: '' });

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    loadEvents();
  }, [isAuthenticated, sport, statusFilter, page]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 30 };
      if (sport !== 'all')         params.sport  = sport;
      if (statusFilter !== 'all')  params.status = statusFilter;

      const r = await api.get('/admin/events', { params });
      setEvents(r.data.events || []);
      setTotalCount(r.data.total || 0);
      setTotal(Math.ceil((r.data.total || 0) / 30));
    } catch {
      // Fallback to public endpoint
      try {
        const params: any = {};
        if (sport !== 'all')        params.sport  = sport;
        if (statusFilter !== 'all') params.status = statusFilter;
        const r = await api.get('/odds/events', { params });
        setEvents(r.data.events || []);
        setTotalCount(r.data.events?.length || 0);
      } catch { toast.error('Failed to load events'); }
    } finally {
      setLoading(false);
    }
  }, [sport, statusFilter, page]);

  async function addLocalMatch() {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.commence_time) {
      return toast.error('Home team, away team and kickoff time are required');
    }
    if (!newMatch.odds_home || !newMatch.odds_away) {
      return toast.error('Please enter odds for home and away');
    }
    if (parseFloat(newMatch.odds_home) <= 1 || parseFloat(newMatch.odds_away) <= 1) {
      return toast.error('Odds must be greater than 1.00');
    }
    setSaving(true);
    try {
      await api.post('/admin/events', {
        ...newMatch,
        odds_home: parseFloat(newMatch.odds_home),
        odds_draw: newMatch.odds_draw ? parseFloat(newMatch.odds_draw) : null,
        odds_away: parseFloat(newMatch.odds_away),
      });
      toast.success('✅ Match added! Live on frontend now.');
      setShowAddModal(false);
      setNewMatch({ home_team: '', away_team: '', league: 'TNM Super League', sport_id: 'football', commence_time: '', odds_home: '', odds_draw: '', odds_away: '' });
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add match');
    } finally { setSaving(false); }
  }

  async function updateOdds() {
    if (!showOddsModal) return;
    if (!oddsEdit.home || !oddsEdit.away) return toast.error('Home and Away odds are required');
    if (parseFloat(oddsEdit.home) <= 1 || parseFloat(oddsEdit.away) <= 1) return toast.error('Odds must be > 1.00');
    setSaving(true);
    try {
      await api.patch(`/admin/events/${showOddsModal.id}/odds`, {
        odds_home: parseFloat(oddsEdit.home),
        odds_draw: oddsEdit.draw ? parseFloat(oddsEdit.draw) : null,
        odds_away: parseFloat(oddsEdit.away),
      });
      toast.success('✅ Odds updated! Live on frontend instantly.');
      setShowOddsModal(null);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update odds');
    } finally { setSaving(false); }
  }

  async function suspendMarket(eventId: string, currentlySuspended: boolean) {
    try {
      await api.patch(`/admin/events/${eventId}/suspend`, { suspend: !currentlySuspended });
      toast.success(currentlySuspended ? '✅ Market reopened on frontend' : '⛔ Market suspended on frontend');
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function setResult() {
    if (!showResultModal) return;
    if (!resultForm.result) return toast.error('Please select a result');
    if (resultForm.home_score === '' || resultForm.away_score === '') return toast.error('Please enter the score');
    setSaving(true);
    try {
      await api.patch(`/admin/events/${showResultModal.id}/result`, {
        home_score: parseInt(resultForm.home_score),
        away_score: parseInt(resultForm.away_score),
        result:     resultForm.result,
      });
      toast.success('✅ Result saved! Bets will be settled automatically.');
      setShowResultModal(null);
      setResultForm({ home_score: '', away_score: '', result: '' });
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set result');
    } finally { setSaving(false); }
  }

  async function deleteEvent() {
    if (!showDeleteModal) return;
    setSaving(true);
    try {
      await api.delete(`/admin/events/${showDeleteModal.id}`);
      toast.success('Event deleted');
      setShowDeleteModal(null);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally { setSaving(false); }
  }

  const filtered = events.filter(e =>
    !search ||
    e.home_team?.toLowerCase().includes(search.toLowerCase()) ||
    e.away_team?.toLowerCase().includes(search.toLowerCase()) ||
    e.league?.toLowerCase().includes(search.toLowerCase())
  );

  const liveCount     = events.filter(e => e.status === 'live').length;
  const upcomingCount = events.filter(e => e.status === 'upcoming').length;
  const manualCount   = events.filter(e => e.external_id?.startsWith('manual_')).length;

  return (
    <>
      <Head><title>Sports & Odds — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Sports & Odds Management">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Live Events"     value={liveCount}     icon="🔴" color="red"    format="number" sub="Happening now" />
          <StatCard label="Upcoming Events" value={upcomingCount} icon="📅" color="blue"   format="number" sub="Scheduled" />
          <StatCard label="Total Events"    value={totalCount}    icon="📊" color="green"  format="number" sub="In database" />
          <StatCard label="Manual Matches"  value={manualCount}   icon="✍️" color="yellow" format="number" sub="Added by admin" />
        </div>

        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
            {SPORTS.map(s => (
              <button key={s.id} onClick={() => { setSport(s.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${sport === s.id ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex-shrink-0">
            + Add Local Match
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-4">
          {STATUS_OPTS.map(s => (
            <button key={s.id} onClick={() => { setStatusFilter(s.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === s.id ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
              {s.id === 'live' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block mr-1.5" />}
              {s.label}
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by team name or league..." />

        {/* Events table */}
        <div className="admin-card overflow-hidden">
          {loading ? <TableSkeleton rows={8} cols={7} /> :
           filtered.length === 0 ? (
             <EmptyState
               icon="⚽"
               title="No events found"
               subtitle="Add a local match manually or wait for the odds poller to sync events from API-Football"
             />
           ) : (
             <>
               <div className="overflow-x-auto">
                 <table className="admin-table">
                   <thead>
                     <tr>
                       <th>Match</th>
                       <th>Sport</th>
                       <th>League</th>
                       <th>Kickoff</th>
                       <th>Odds (1 / X / 2)</th>
                       <th>Markets</th>
                       <th>Status</th>
                       <th>Source</th>
                       <th>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filtered.map(e => {
                       const markets = e.markets || [];
                       const home    = markets.find((m: any) => m.market_type === 'h2h' && m.outcome === e.home_team);
                       const draw    = markets.find((m: any) => m.market_type === 'h2h' && m.outcome === 'Draw');
                       const away    = markets.find((m: any) => m.market_type === 'h2h' && m.outcome === e.away_team);
                       const sportMeta = SPORTS.find(s => s.id === e.sport_id);
                       const isManual  = e.external_id?.startsWith('manual_');
                       const allInactive = markets.length > 0 && markets.every((m: any) => !m.is_active);
                       const marketTypes = [...new Set(markets.map((m: any) => m.market_type))];

                       return (
                         <tr key={e.id} className={allInactive ? 'opacity-50' : ''}>
                           <td>
                             <div>
                               <p className="text-white font-medium text-sm">{e.home_team}</p>
                               <p className="text-gray-500 text-xs">vs {e.away_team}</p>
                               {e.status === 'live' && (
                                 <p className="text-brand text-xs font-bold">
                                   {e.home_score ?? 0} - {e.away_score ?? 0} LIVE
                                 </p>
                               )}
                               {e.status === 'finished' && e.result && (
                                 <p className="text-gray-400 text-xs">
                                   FT: {e.home_score} - {e.away_score}
                                 </p>
                               )}
                             </div>
                           </td>
                           <td>
                             <span className="text-lg">{sportMeta?.emoji || '🏆'}</span>
                           </td>
                           <td className="text-xs text-gray-400 max-w-[120px] truncate">{e.league}</td>
                           <td className="text-xs text-gray-400">{fmt.datetime(e.commence_time)}</td>
                           <td>
                             {(home || draw || away) ? (
                               <div className="flex items-center gap-1 text-xs">
                                 <span className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded text-white font-bold">
                                   {home ? fmt.odds(home.odds) : '—'}
                                 </span>
                                 {draw && (
                                   <span className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded text-white font-bold">
                                     {fmt.odds(draw.odds)}
                                   </span>
                                 )}
                                 <span className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded text-white font-bold">
                                   {away ? fmt.odds(away.odds) : '—'}
                                 </span>
                               </div>
                             ) : (
                               <span className="text-gray-600 text-xs">No odds</span>
                             )}
                           </td>
                           <td>
                             <div className="flex flex-wrap gap-0.5">
                               {marketTypes.slice(0, 3).map((mt: any) => (
                                 <span key={mt} className="text-xs bg-admin-surface border border-admin-border px-1 py-0.5 rounded text-gray-500 capitalize">
                                   {mt === 'h2h' ? '1X2' : mt === 'totals' ? 'O/U' : mt === 'double_chance' ? 'DC' : mt === 'correct_score' ? 'CS' : mt}
                                 </span>
                               ))}
                               {marketTypes.length > 3 && (
                                 <span className="text-xs text-brand">+{marketTypes.length - 3}</span>
                               )}
                             </div>
                           </td>
                           <td>
                             {allInactive
                               ? <span className="badge badge-danger">Suspended</span>
                               : <Badge status={e.status} />}
                           </td>
                           <td>
                             {isManual
                               ? <span className="badge badge-info">Manual</span>
                               : <span className="badge badge-gray">API</span>}
                           </td>
                           <td>
                             <div className="flex flex-col gap-1">
                               <button
                                 onClick={() => {
                                   setShowOddsModal(e);
                                   setOddsEdit({
                                     home: home?.odds || '',
                                     draw: draw?.odds || '',
                                     away: away?.odds || '',
                                   });
                                 }}
                                 className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 transition-colors text-left">
                                 ✏️ Edit Odds
                               </button>

                               {e.status !== 'finished' && (
                                 <button
                                   onClick={() => suspendMarket(e.id, allInactive)}
                                   className={'text-xs px-2 py-1 rounded transition-colors text-left ' + (
                                     allInactive
                                       ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                                       : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20'
                                   )}>
                                   {allInactive ? '▶ Reopen' : '⏸ Suspend'}
                                 </button>
                               )}

                               {e.status === 'live' && (
                                 <button
                                   onClick={() => { setShowResultModal(e); setResultForm({ home_score: '', away_score: '', result: '' }); }}
                                   className="text-xs text-brand hover:text-brand-dark px-2 py-1 rounded hover:bg-brand/10 transition-colors text-left">
                                   🏁 Set Result
                                 </button>
                               )}

                               {isManual && e.status === 'upcoming' && (
                                 <button
                                   onClick={() => setShowDeleteModal(e)}
                                   className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors text-left">
                                   🗑 Delete
                                 </button>
                               )}
                             </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
               <Pagination page={page} total={total} onPage={setPage} />
             </>
           )}
        </div>

        {/* ── Add Local Match Modal ── */}
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Local Match">
          <div className="space-y-4">
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
              <p className="text-brand text-xs font-medium">
                ⚡ This match will appear on the live betting website instantly after saving.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Sport *</label>
                <select value={newMatch.sport_id} onChange={e => setNewMatch(m => ({ ...m, sport_id: e.target.value }))}
                  className="admin-select w-full">
                  {SPORTS.filter(s => s.id !== 'all').map(s => (
                    <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Home Team *</label>
                <input value={newMatch.home_team} onChange={e => setNewMatch(m => ({ ...m, home_team: e.target.value }))}
                  placeholder="e.g. Nyasa Big Bullets" className="admin-input" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Away Team *</label>
                <input value={newMatch.away_team} onChange={e => setNewMatch(m => ({ ...m, away_team: e.target.value }))}
                  placeholder="e.g. Mighty Wanderers" className="admin-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">League</label>
                <select value={newMatch.league} onChange={e => setNewMatch(m => ({ ...m, league: e.target.value }))}
                  className="admin-select w-full">
                  {LOCAL_LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Kickoff Date & Time *</label>
                <input type="datetime-local" value={newMatch.commence_time}
                  onChange={e => setNewMatch(m => ({ ...m, commence_time: e.target.value }))}
                  className="admin-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Odds *</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Home Win (1) *</label>
                  <input type="number" step="0.01" min="1.01"
                    value={newMatch.odds_home}
                    onChange={e => setNewMatch(m => ({ ...m, odds_home: e.target.value }))}
                    placeholder="e.g. 1.85" className="admin-input text-center font-bold" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Draw (X)</label>
                  <input type="number" step="0.01" min="1.01"
                    value={newMatch.odds_draw}
                    onChange={e => setNewMatch(m => ({ ...m, odds_draw: e.target.value }))}
                    placeholder="e.g. 3.20" className="admin-input text-center font-bold" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Away Win (2) *</label>
                  <input type="number" step="0.01" min="1.01"
                    value={newMatch.odds_away}
                    onChange={e => setNewMatch(m => ({ ...m, odds_away: e.target.value }))}
                    placeholder="e.g. 4.50" className="admin-input text-center font-bold" />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1.5">* Required. Over/Under, BTTS, Handicap and other markets are auto-generated.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={addLocalMatch} disabled={saving} className="btn-primary flex-1 py-3">
                {saving ? 'Adding...' : '⚽ Add Match — Goes Live Instantly'}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

        {/* ── Edit Odds Modal ── */}
        <Modal open={!!showOddsModal} onClose={() => setShowOddsModal(null)} title="Edit Odds">
          {showOddsModal && (
            <div className="space-y-4">
              <div className="bg-admin-surface rounded-xl p-3">
                <p className="text-white font-medium">{showOddsModal.home_team} vs {showOddsModal.away_team}</p>
                <p className="text-gray-500 text-xs">{showOddsModal.league} · {fmt.datetime(showOddsModal.commence_time)}</p>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3">
                <p className="text-yellow-400 text-xs">⚡ Changes will appear on the live betting website <strong>instantly</strong> via WebSocket.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Home Win (1)</label>
                  <input type="number" step="0.01" min="1.01" value={oddsEdit.home}
                    onChange={e => setOddsEdit(o => ({ ...o, home: e.target.value }))}
                    className="admin-input text-center font-bold text-lg" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Draw (X)</label>
                  <input type="number" step="0.01" min="1.01" value={oddsEdit.draw}
                    onChange={e => setOddsEdit(o => ({ ...o, draw: e.target.value }))}
                    className="admin-input text-center font-bold text-lg" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Away Win (2)</label>
                  <input type="number" step="0.01" min="1.01" value={oddsEdit.away}
                    onChange={e => setOddsEdit(o => ({ ...o, away: e.target.value }))}
                    className="admin-input text-center font-bold text-lg" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={updateOdds} disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Updating...' : '⚡ Update Odds — Live Instantly'}
                </button>
                <button onClick={() => setShowOddsModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── Set Result Modal ── */}
        <Modal open={!!showResultModal} onClose={() => setShowResultModal(null)} title="Set Match Result">
          {showResultModal && (
            <div className="space-y-4">
              <div className="bg-admin-surface rounded-xl p-3">
                <p className="text-white font-medium text-center text-lg">
                  {showResultModal.home_team} vs {showResultModal.away_team}
                </p>
              </div>
              <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
                <p className="text-brand text-xs">Setting the result will mark bets as won/lost and trigger automatic payout processing.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Final Score</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 text-center">{showResultModal.home_team}</p>
                    <input type="number" min="0" max="20" value={resultForm.home_score}
                      onChange={e => setResultForm(f => ({ ...f, home_score: e.target.value }))}
                      className="admin-input text-center text-3xl font-black py-4" placeholder="0" />
                  </div>
                  <span className="text-2xl text-gray-500 font-bold">-</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 text-center">{showResultModal.away_team}</p>
                    <input type="number" min="0" max="20" value={resultForm.away_score}
                      onChange={e => setResultForm(f => ({ ...f, away_score: e.target.value }))}
                      className="admin-input text-center text-3xl font-black py-4" placeholder="0" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Winner</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'home', label: showResultModal.home_team, short: 'Home Win' },
                    { value: 'draw', label: 'Draw',                    short: 'Draw' },
                    { value: 'away', label: showResultModal.away_team,  short: 'Away Win' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setResultForm(f => ({ ...f, result: opt.value }))}
                      className={`py-3 px-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        resultForm.result === opt.value
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-admin-border text-gray-400 hover:border-gray-500'
                      }`}>
                      <p className="text-base mb-0.5">{opt.value === 'home' ? '🏠' : opt.value === 'draw' ? '🤝' : '✈️'}</p>
                      <p className="truncate">{opt.short}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={setResult} disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Saving...' : '🏁 Confirm Result & Settle Bets'}
                </button>
                <button onClick={() => setShowResultModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── Delete Confirmation Modal ── */}
        <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Delete Event">
          {showDeleteModal && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Are you sure you want to delete <strong className="text-white">{showDeleteModal.home_team} vs {showDeleteModal.away_team}</strong>?
              </p>
              <p className="text-yellow-400 text-xs">⚠️ This cannot be undone. Events with pending bets cannot be deleted.</p>
              <div className="flex gap-2">
                <button onClick={deleteEvent} disabled={saving} className="btn-danger flex-1 py-3">
                  {saving ? 'Deleting...' : '🗑 Confirm Delete'}
                </button>
                <button onClick={() => setShowDeleteModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
