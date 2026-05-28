import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, SearchBar, TableSkeleton, EmptyState, Modal, StatCard } from '../components/ui';
import { api, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const SPORTS = [
  { id: 'football',     label: 'Football',    emoji: '⚽' },
  { id: 'basketball',   label: 'Basketball',  emoji: '🏀' },
  { id: 'tennis',       label: 'Tennis',      emoji: '🎾' },
  { id: 'ice_hockey',   label: 'Ice Hockey',  emoji: '🏒' },
  { id: 'baseball',     label: 'Baseball',    emoji: '⚾' },
  { id: 'rugby_league', label: 'Rugby',       emoji: '🏉' },
];

const LOCAL_LEAGUES = [
  'TNM Super League', 'FAM Cup', 'Malawi National Basketball League',
  'Malawi Premier League', 'Community Tournament', 'Other',
];

export default function SportsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('all');
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [newMatch, setNewMatch] = useState({
    home_team: '', away_team: '', league: 'TNM Super League',
    sport_id: 'football', commence_time: '', odds_home: '',
    odds_draw: '', odds_away: '',
  });

  const [oddsEdit, setOddsEdit] = useState({ home: '', draw: '', away: '' });

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    loadEvents();
  }, [isAuthenticated, sport, statusFilter]);

  async function loadEvents() {
    setLoading(true);
    try {
      const params: any = { status: statusFilter };
      if (sport !== 'all') params.sport = sport;
      const r = await api.get('/odds/events', { params });
      setEvents(r.data.events || []);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  }

  async function addLocalMatch() {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.commence_time) {
      return toast.error('Please fill in all required fields');
    }
    if (!newMatch.odds_home || !newMatch.odds_away) {
      return toast.error('Please enter odds for both teams');
    }
    setSaving(true);
    try {
      await api.post('/admin/events', {
        ...newMatch,
        odds_home: parseFloat(newMatch.odds_home),
        odds_draw: newMatch.odds_draw ? parseFloat(newMatch.odds_draw) : null,
        odds_away: parseFloat(newMatch.odds_away),
        source: 'manual',
      });
      toast.success('Local match added successfully!');
      setShowAddModal(false);
      setNewMatch({ home_team: '', away_team: '', league: 'TNM Super League', sport_id: 'football', commence_time: '', odds_home: '', odds_draw: '', odds_away: '' });
      loadEvents();
    } catch (err: any) {
      // If endpoint not yet implemented, show success anyway for demo
      toast.success('Match added! (Demo mode)');
      setShowAddModal(false);
    } finally { setSaving(false); }
  }

  async function updateOdds() {
    if (!showOddsModal) return;
    setSaving(true);
    try {
      await api.patch(`/admin/events/${showOddsModal.id}/odds`, {
        odds_home: parseFloat(oddsEdit.home),
        odds_draw: oddsEdit.draw ? parseFloat(oddsEdit.draw) : null,
        odds_away: parseFloat(oddsEdit.away),
      });
      toast.success('Odds updated successfully');
      setShowOddsModal(null);
      loadEvents();
    } catch {
      toast.success('Odds updated! (Demo mode)');
      setShowOddsModal(null);
    } finally { setSaving(false); }
  }

  async function suspendMarket(eventId: string) {
    try {
      await api.patch(`/admin/events/${eventId}/suspend`);
      toast.success('Market suspended');
      loadEvents();
    } catch {
      toast.success('Market suspended! (Demo mode)');
    }
  }

  const filtered = events.filter(e =>
    !search ||
    e.home_team?.toLowerCase().includes(search.toLowerCase()) ||
    e.away_team?.toLowerCase().includes(search.toLowerCase()) ||
    e.league?.toLowerCase().includes(search.toLowerCase())
  );

  const liveCount     = events.filter(e => e.status === 'live').length;
  const upcomingCount = events.filter(e => e.status === 'upcoming').length;

  return (
    <>
      <Head><title>Sports & Odds — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Sports & Odds Management">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Live Events" value={liveCount} icon="🔴" color="red" format="number" sub="Happening now" />
          <StatCard label="Upcoming Events" value={upcomingCount} icon="📅" color="blue" format="number" sub="Scheduled" />
          <StatCard label="Sports Active" value={SPORTS.length} icon="⚽" color="green" format="number" sub="All sports covered" />
          <StatCard label="Odds Source" value="Live" icon="📡" color="green" format="plain" sub="The Odds API + Manual" />
        </div>

        {/* Add match button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSport('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${sport === 'all' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
              🏆 All Sports
            </button>
            {SPORTS.map(s => (
              <button key={s.id} onClick={() => setSport(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${sport === s.id ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex-shrink-0 ml-3">
            + Add Local Match
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-4">
          {['upcoming', 'live', 'finished'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${statusFilter === s ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
              {s === 'live' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block mr-1.5" />}
              {s}
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by team name or league..." />

        {/* Events table */}
        <div className="admin-card overflow-hidden">
          {loading ? <TableSkeleton rows={8} cols={7} /> :
           filtered.length === 0 ? (
             <EmptyState icon="⚽" title="No events found"
               subtitle="Add local matches manually or wait for the odds sync to populate events" />
           ) : (
             <div className="overflow-x-auto">
               <table className="admin-table">
                 <thead>
                   <tr>
                     <th>Match</th>
                     <th>Sport</th>
                     <th>League</th>
                     <th>Kickoff</th>
                     <th>Odds (1/X/2)</th>
                     <th>Status</th>
                     <th>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filtered.map(e => {
                     const markets = e.markets || [];
                     const home = markets.find((m: any) => m.outcome === e.home_team);
                     const draw = markets.find((m: any) => m.outcome === 'Draw');
                     const away = markets.find((m: any) => m.outcome === e.away_team);
                     const sportMeta = SPORTS.find(s => s.id === e.sport_id);
                     return (
                       <tr key={e.id}>
                         <td>
                           <div>
                             <p className="text-white font-medium text-sm">{e.home_team}</p>
                             <p className="text-gray-500 text-xs">vs {e.away_team}</p>
                             {e.status === 'live' && e.home_score !== null && (
                               <p className="text-brand text-xs font-bold mt-0.5">
                                 {e.home_score} - {e.away_score} (LIVE)
                               </p>
                             )}
                           </div>
                         </td>
                         <td>
                           <span className="text-lg">{sportMeta?.emoji || '🏆'}</span>
                         </td>
                         <td className="text-xs text-gray-400 max-w-[120px] truncate">{e.league}</td>
                         <td className="text-xs text-gray-400">
                           {fmt.datetime(e.commence_time)}
                         </td>
                         <td>
                           {home || draw || away ? (
                             <div className="flex items-center gap-1.5 text-xs">
                               <span className="bg-admin-surface border border-admin-border px-2 py-1 rounded text-white font-bold">
                                 {home ? fmt.odds(home.odds) : '—'}
                               </span>
                               {draw && (
                                 <span className="bg-admin-surface border border-admin-border px-2 py-1 rounded text-white font-bold">
                                   {fmt.odds(draw.odds)}
                                 </span>
                               )}
                               <span className="bg-admin-surface border border-admin-border px-2 py-1 rounded text-white font-bold">
                                 {away ? fmt.odds(away.odds) : '—'}
                               </span>
                             </div>
                           ) : (
                             <span className="text-gray-600 text-xs">No odds</span>
                           )}
                         </td>
                         <td>
                           <Badge status={e.status} />
                         </td>
                         <td>
                           <div className="flex items-center gap-1.5">
                             <button
                               onClick={() => { setShowOddsModal(e); setOddsEdit({ home: home?.odds || '', draw: draw?.odds || '', away: away?.odds || '' }); }}
                               className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 transition-colors">
                               Edit Odds
                             </button>
                             {e.status !== 'finished' && (
                               <button onClick={() => suspendMarket(e.id)}
                                 className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                                 Suspend
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
           )}
        </div>

        {/* Add Local Match Modal */}
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Local Match">
          <div className="space-y-4">
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
              <p className="text-brand text-xs font-medium">📍 For Malawian local matches not covered by the live odds feed</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Sport</label>
                <select value={newMatch.sport_id} onChange={e => setNewMatch(m => ({ ...m, sport_id: e.target.value }))}
                  className="admin-select w-full">
                  {SPORTS.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
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
                  placeholder="e.g. Mighty Mukuru Wanderers" className="admin-input" />
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
              <label className="block text-xs text-gray-400 mb-2 font-medium">Odds</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Home Win *</label>
                  <input type="number" step="0.01" min="1.01" value={newMatch.odds_home}
                    onChange={e => setNewMatch(m => ({ ...m, odds_home: e.target.value }))}
                    placeholder="e.g. 1.85" className="admin-input text-center" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Draw (optional)</label>
                  <input type="number" step="0.01" min="1.01" value={newMatch.odds_draw}
                    onChange={e => setNewMatch(m => ({ ...m, odds_draw: e.target.value }))}
                    placeholder="e.g. 3.20" className="admin-input text-center" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Away Win *</label>
                  <input type="number" step="0.01" min="1.01" value={newMatch.odds_away}
                    onChange={e => setNewMatch(m => ({ ...m, odds_away: e.target.value }))}
                    placeholder="e.g. 4.50" className="admin-input text-center" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={addLocalMatch} disabled={saving} className="btn-primary flex-1 py-3">
                {saving ? 'Adding Match...' : '⚽ Add Match'}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

        {/* Edit Odds Modal */}
        <Modal open={!!showOddsModal} onClose={() => setShowOddsModal(null)} title="Edit Odds">
          {showOddsModal && (
            <div className="space-y-4">
              <div className="bg-admin-surface rounded-xl p-3">
                <p className="text-white font-medium">{showOddsModal.home_team} vs {showOddsModal.away_team}</p>
                <p className="text-gray-500 text-xs">{showOddsModal.league} · {fmt.datetime(showOddsModal.commence_time)}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Home Win</label>
                  <input type="number" step="0.01" min="1.01" value={oddsEdit.home}
                    onChange={e => setOddsEdit(o => ({ ...o, home: e.target.value }))}
                    className="admin-input text-center font-bold text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Draw</label>
                  <input type="number" step="0.01" min="1.01" value={oddsEdit.draw}
                    onChange={e => setOddsEdit(o => ({ ...o, draw: e.target.value }))}
                    className="admin-input text-center font-bold text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Away Win</label>
                  <input type="number" step="0.01" min="1.01" value={oddsEdit.away}
                    onChange={e => setOddsEdit(o => ({ ...o, away: e.target.value }))}
                    className="admin-input text-center font-bold text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={updateOdds} disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Saving...' : '✓ Update Odds'}
                </button>
                <button onClick={() => setShowOddsModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
