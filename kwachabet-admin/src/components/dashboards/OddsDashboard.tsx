import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { StatCard, Skeleton, EmptyState, Modal } from '../ui';
import { sportsAPI, betsAPI, fmt } from '../../lib/adminApi';
import { useAdminStore } from '../../store/adminStore';
import toast from 'react-hot-toast';

const SPORTS = [
  { id: 'all',       label: 'All',      emoji: '🏆' },
  { id: 'football',  label: 'Football', emoji: '⚽' },
  { id: 'basketball',label: 'Basketball',emoji:'🏀' },
  { id: 'tennis',    label: 'Tennis',   emoji: '🎾' },
];

const LOCAL_LEAGUES = ['TNM Super League','FAM Cup','COSAFA Cup','CAF Champions League','Other'];

export default function OddsDashboard() {
  const { admin } = useAdminStore();
  const [events, setEvents]       = useState<any[]>([]);
  const [pending, setPending]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sport, setSport]         = useState('all');
  const [status, setStatus]       = useState('upcoming');
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);

  // Modals
  const [oddsModal, setOddsModal]     = useState<any>(null);
  const [resultModal, setResultModal] = useState<any>(null);
  const [addModal, setAddModal]       = useState(false);

  const [oddsEdit, setOddsEdit]     = useState({ home: '', draw: '', away: '' });
  const [resultForm, setResultForm] = useState({ home_score: '', away_score: '', result: '' });
  const [newMatch, setNewMatch]     = useState({
    home_team: '', away_team: '', league: 'TNM Super League',
    sport_id: 'football', commence_time: '',
    odds_home: '', odds_draw: '', odds_away: '',
  });

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (sport !== 'all') params.sport  = sport;
      if (status !== 'all') params.status = status;
      const [eR, tR] = await Promise.allSettled([
        sportsAPI.list(params),
        betsAPI.list({ limit: 10, status: 'pending' }),
      ]);
      if (eR.status === 'fulfilled') setEvents(eR.value.data.events || []);
      if (tR.status === 'fulfilled') setPending(tR.value.data.tickets || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [sport, status]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function updateOdds() {
    if (!oddsModal) return;
    if (!oddsEdit.home || !oddsEdit.away) return toast.error('Home and Away odds required');
    setSaving(true);
    try {
      await sportsAPI.updateOdds(oddsModal.id, {
        odds_home: parseFloat(oddsEdit.home),
        odds_draw: oddsEdit.draw ? parseFloat(oddsEdit.draw) : null,
        odds_away: parseFloat(oddsEdit.away),
      });
      toast.success('✅ Odds updated — Live on frontend instantly');
      setOddsModal(null);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function setResult() {
    if (!resultModal) return;
    if (!resultForm.result) return toast.error('Select a result');
    if (resultForm.home_score === '' || resultForm.away_score === '') return toast.error('Enter the score');
    setSaving(true);
    try {
      await sportsAPI.setResult(resultModal.id, {
        home_score: parseInt(resultForm.home_score),
        away_score: parseInt(resultForm.away_score),
        result: resultForm.result,
      });
      toast.success('✅ Result saved — Bets will settle automatically');
      setResultModal(null);
      setResultForm({ home_score: '', away_score: '', result: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function suspendMarket(eventId: string, isSuspended: boolean) {
    try {
      await sportsAPI.suspend(eventId, { suspend: !isSuspended });
      toast.success(isSuspended ? '▶ Market reopened on frontend' : '⏸ Market suspended on frontend');
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function addMatch() {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.commence_time) return toast.error('Fill all required fields');
    if (!newMatch.odds_home || !newMatch.odds_away) return toast.error('Enter odds');
    setSaving(true);
    try {
      await sportsAPI.create({
        ...newMatch,
        odds_home: parseFloat(newMatch.odds_home),
        odds_draw: newMatch.odds_draw ? parseFloat(newMatch.odds_draw) : null,
        odds_away: parseFloat(newMatch.odds_away),
      });
      toast.success('✅ Match added — Live on frontend now');
      setAddModal(false);
      setNewMatch({ home_team:'',away_team:'',league:'TNM Super League',sport_id:'football',commence_time:'',odds_home:'',odds_draw:'',odds_away:'' });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
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
    <AdminLayout title="Odds Manager Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome, <span className="text-white font-semibold">{admin?.full_name}</span></p>
          <p className="text-green-400 text-xs font-medium mt-0.5">🟢 Odds Manager</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAddModal(true)} className="btn-primary text-sm">+ Add Match</button>
          <button onClick={load} className="btn-secondary text-xs py-2 px-3">🔄</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Live Events"     value={liveCount}     icon="🔴" color="red"    format="number" sub="In progress" />
        <StatCard label="Upcoming Events" value={upcomingCount} icon="📅" color="blue"   format="number" sub="Scheduled" />
        <StatCard label="Pending Bets"    value={pending.length}icon="🎯" color="yellow" format="number" sub="Need settlement" />
        <StatCard label="Total Events"    value={events.length} icon="📊" color="green"  format="number" sub="In database" />
      </div>

      {/* Sport + status filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SPORTS.map(s => (
          <button key={s.id} onClick={() => setSport(s.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${sport===s.id?'bg-brand text-black':'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {['upcoming','live','finished','all'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${status===s?'bg-brand text-black':'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
            {s === 'live' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block mr-1" />}
            {s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by team or league..." className="admin-input pl-9" />
      </div>

      {/* Events table */}
      <div className="admin-card overflow-hidden mb-6">
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(6)].map((_,i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="⚽" title="No events found" subtitle="Add a local match or wait for odds sync" />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr><th>Match</th><th>League</th><th>Kickoff</th><th>Odds (1/X/2)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const markets    = e.markets || [];
                  const home       = markets.find((m:any) => m.market_type==='h2h' && m.outcome===e.home_team);
                  const draw       = markets.find((m:any) => m.market_type==='h2h' && m.outcome==='Draw');
                  const away       = markets.find((m:any) => m.market_type==='h2h' && m.outcome===e.away_team);
                  const isManual   = e.external_id?.startsWith('manual_');
                  const allInactive= markets.length>0 && markets.every((m:any) => !m.is_active);
                  return (
                    <tr key={e.id} className={allInactive?'opacity-50':''}>
                      <td>
                        <p className="text-white font-medium text-sm">{e.home_team}</p>
                        <p className="text-gray-500 text-xs">vs {e.away_team}</p>
                        {e.status==='live' && <p className="text-brand text-xs font-bold">{e.home_score??0} - {e.away_score??0} LIVE</p>}
                        {e.status==='finished' && <p className="text-gray-400 text-xs">FT: {e.home_score} - {e.away_score}</p>}
                      </td>
                      <td className="text-xs text-gray-400">{e.league}</td>
                      <td className="text-xs text-gray-400">{fmt.datetime(e.commence_time)}</td>
                      <td>
                        {(home||draw||away) ? (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded text-white font-bold">{home?fmt.odds(home.odds):'—'}</span>
                            {draw && <span className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded text-white font-bold">{fmt.odds(draw.odds)}</span>}
                            <span className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded text-white font-bold">{away?fmt.odds(away.odds):'—'}</span>
                          </div>
                        ) : <span className="text-gray-600 text-xs">No odds</span>}
                      </td>
                      <td>
                        {allInactive
                          ? <span className="badge badge-danger">Suspended</span>
                          : <span className={`badge ${e.status==='live'?'badge-danger':e.status==='finished'?'badge-gray':'badge-success'} capitalize`}>{e.status}</span>
                        }
                        {isManual && <span className="badge badge-info ml-1 text-xs">Manual</span>}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => { setOddsModal(e); setOddsEdit({ home:home?.odds||'', draw:draw?.odds||'', away:away?.odds||'' }); }}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 text-left">
                            ✏️ Odds
                          </button>
                          {e.status !== 'finished' && (
                            <button onClick={() => suspendMarket(e.id, allInactive)}
                              className={'text-xs px-2 py-1 rounded text-left '+(allInactive?'text-green-400 hover:bg-green-900/20':'text-yellow-400 hover:bg-yellow-900/20')}>
                              {allInactive ? '▶ Reopen' : '⏸ Suspend'}
                            </button>
                          )}
                          {e.status === 'live' && (
                            <button onClick={() => { setResultModal(e); setResultForm({ home_score:'', away_score:'', result:'' }); }}
                              className="text-xs text-brand hover:bg-brand/10 px-2 py-1 rounded text-left">
                              🏁 Result
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

      {/* Pending bets for settlement */}
      <div className="admin-card">
        <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Pending Bets (Settlement Queue)</h3>
          <a href="/bets" className="text-brand text-xs hover:underline">All →</a>
        </div>
        {loading ? <div className="p-4 space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
        : pending.length===0 ? <EmptyState icon="✅" title="No pending bets" />
        : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Ticket</th><th>Customer</th><th>Stake</th><th>Odds</th><th>Potential Win</th><th>Date</th></tr></thead>
              <tbody>
                {pending.map((t:any) => (
                  <tr key={t.id}>
                    <td className="font-mono text-brand font-bold text-xs">{t.ticket_code}</td>
                    <td className="text-xs text-gray-400 font-mono">{t.user_phone}</td>
                    <td className="text-white font-medium">{fmt.mwk(t.stake)}</td>
                    <td className="text-yellow-400 font-bold">{fmt.odds(t.total_odds)}</td>
                    <td className="text-gray-300">{fmt.mwk(t.potential_win)}</td>
                    <td className="text-xs text-gray-500">{fmt.timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Odds Modal */}
      <Modal open={!!oddsModal} onClose={() => setOddsModal(null)} title="Edit Odds">
        {oddsModal && (
          <div className="space-y-4">
            <div className="bg-admin-surface rounded-xl p-3">
              <p className="text-white font-medium">{oddsModal.home_team} vs {oddsModal.away_team}</p>
              <p className="text-gray-500 text-xs">{oddsModal.league} · {fmt.datetime(oddsModal.commence_time)}</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3">
              <p className="text-yellow-400 text-xs">⚡ Changes appear on live frontend instantly via WebSocket.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Home (1)</label>
                <input type="number" step="0.01" min="1.01" value={oddsEdit.home} onChange={e => setOddsEdit(o=>({...o,home:e.target.value}))} className="admin-input text-center font-bold text-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Draw (X)</label>
                <input type="number" step="0.01" min="1.01" value={oddsEdit.draw} onChange={e => setOddsEdit(o=>({...o,draw:e.target.value}))} className="admin-input text-center font-bold text-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Away (2)</label>
                <input type="number" step="0.01" min="1.01" value={oddsEdit.away} onChange={e => setOddsEdit(o=>({...o,away:e.target.value}))} className="admin-input text-center font-bold text-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={updateOdds} disabled={saving} className="btn-primary flex-1 py-3">{saving?'Updating...':'⚡ Update Live'}</button>
              <button onClick={() => setOddsModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Set Result Modal */}
      <Modal open={!!resultModal} onClose={() => setResultModal(null)} title="Set Match Result">
        {resultModal && (
          <div className="space-y-4">
            <p className="text-white font-medium text-center text-lg">{resultModal.home_team} vs {resultModal.away_team}</p>
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
              <p className="text-brand text-xs">Setting the result will settle all bets on this match automatically.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1 text-center">{resultModal.home_team}</p>
                <input type="number" min="0" max="20" value={resultForm.home_score} onChange={e => setResultForm(f=>({...f,home_score:e.target.value}))} className="admin-input text-center text-3xl font-black py-4" placeholder="0" />
              </div>
              <span className="text-2xl text-gray-500 font-bold">-</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1 text-center">{resultModal.away_team}</p>
                <input type="number" min="0" max="20" value={resultForm.away_score} onChange={e => setResultForm(f=>({...f,away_score:e.target.value}))} className="admin-input text-center text-3xl font-black py-4" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{v:'home',l:'Home Win',i:'🏠'},{v:'draw',l:'Draw',i:'🤝'},{v:'away',l:'Away Win',i:'✈️'}].map(opt => (
                <button key={opt.v} onClick={() => setResultForm(f=>({...f,result:opt.v}))}
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold text-center transition-all ${resultForm.result===opt.v?'border-brand bg-brand/10 text-brand':'border-admin-border text-gray-400 hover:border-gray-500'}`}>
                  <p className="text-base mb-0.5">{opt.i}</p>{opt.l}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={setResult} disabled={saving} className="btn-primary flex-1 py-3">{saving?'Saving...':'🏁 Confirm & Settle'}</button>
              <button onClick={() => setResultModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Match Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Local Match">
        <div className="space-y-4">
          <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
            <p className="text-brand text-xs">⚡ Match goes live on the betting website instantly after saving.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Sport</label>
              <select value={newMatch.sport_id} onChange={e => setNewMatch(m=>({...m,sport_id:e.target.value}))} className="admin-select w-full">
                <option value="football">⚽ Football</option>
                <option value="basketball">🏀 Basketball</option>
                <option value="tennis">🎾 Tennis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Home Team *</label>
              <input value={newMatch.home_team} onChange={e => setNewMatch(m=>({...m,home_team:e.target.value}))} placeholder="e.g. Nyasa Big Bullets" className="admin-input" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Away Team *</label>
              <input value={newMatch.away_team} onChange={e => setNewMatch(m=>({...m,away_team:e.target.value}))} placeholder="e.g. Mighty Wanderers" className="admin-input" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">League</label>
              <select value={newMatch.league} onChange={e => setNewMatch(m=>({...m,league:e.target.value}))} className="admin-select w-full">
                {LOCAL_LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Kickoff Time *</label>
              <input type="datetime-local" value={newMatch.commence_time} onChange={e => setNewMatch(m=>({...m,commence_time:e.target.value}))} className="admin-input" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-xs text-gray-600 mb-1">Home (1) *</label><input type="number" step="0.01" min="1.01" value={newMatch.odds_home} onChange={e => setNewMatch(m=>({...m,odds_home:e.target.value}))} placeholder="1.85" className="admin-input text-center font-bold" /></div>
            <div><label className="block text-xs text-gray-600 mb-1">Draw (X)</label><input type="number" step="0.01" min="1.01" value={newMatch.odds_draw} onChange={e => setNewMatch(m=>({...m,odds_draw:e.target.value}))} placeholder="3.20" className="admin-input text-center font-bold" /></div>
            <div><label className="block text-xs text-gray-600 mb-1">Away (2) *</label><input type="number" step="0.01" min="1.01" value={newMatch.odds_away} onChange={e => setNewMatch(m=>({...m,odds_away:e.target.value}))} placeholder="4.50" className="admin-input text-center font-bold" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addMatch} disabled={saving} className="btn-primary flex-1 py-3">{saving?'Adding...':'⚽ Add Match'}</button>
            <button onClick={() => setAddModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
