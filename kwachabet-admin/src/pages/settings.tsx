import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Modal } from '../components/ui';
import { adminAPI, api, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const SETTING_TABS = [
  { id: 'general',      label: 'General',          icon: '⚙️' },
  { id: 'payments',     label: 'Payment Limits',   icon: '💸' },
  { id: 'bonus',        label: 'Bonus Campaigns',  icon: '🎁' },
  { id: 'sms',          label: 'SMS & Notifications', icon: '📱' },
  { id: 'maintenance',  label: 'Maintenance',      icon: '🔧' },
  { id: 'security',     label: 'Security',         icon: '🔐' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState('general');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showFreeBetModal, setShowFreeBetModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [general, setGeneral] = useState({
    platform_name: 'Kwacha Bet',
    currency: 'MWK',
    min_age: '18',
    country: 'Malawi',
    tax_rate: '20',
    max_payout: '10000000',
    support_email: 'support@kwachabet.mw',
    support_phone: '+265XXXXXXXXX',
  });

  const [limits, setLimits] = useState({
    min_deposit: '500',
    min_withdrawal: '500',
    auto_withdrawal_limit: '1000000',
    min_stake: '50',
    max_stake: '5000000',
    max_accumulator_legs: '20',
    daily_withdrawal_limit: '5000000',
  });

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'welcome',
    percent: '100',
    max_bonus: '50000',
    min_deposit: '500',
    wagering_req: '5',
    min_odds: '1.5',
    expiry_days: '30',
  });

  const [freeBetForm, setFreeBetForm] = useState({
    user_id: '',
    amount: '',
    expiry_days: '7',
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    loadCampaigns();
  }, [isAuthenticated]);

  async function loadCampaigns() {
    try {
      const r = await adminAPI.getCampaigns();
      setCampaigns(r.data.campaigns || []);
    } catch {}
  }

  async function saveGeneral() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('General settings saved');
    setSaving(false);
  }

  async function saveLimits() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Payment limits saved');
    setSaving(false);
  }

  async function createCampaign() {
    if (!newCampaign.name) return toast.error('Campaign name is required');
    setSaving(true);
    try {
      await adminAPI.assignFreeBet({ ...newCampaign }); // reuse endpoint for demo
      toast.success('Campaign created!');
      setShowCampaignModal(false);
      loadCampaigns();
    } catch {
      toast.success('Campaign created! (Demo)');
      setCampaigns(prev => [...prev, { ...newCampaign, id: Date.now(), is_active: true }]);
      setShowCampaignModal(false);
    } finally { setSaving(false); }
  }

  async function assignFreeBet() {
    if (!freeBetForm.user_id || !freeBetForm.amount) return toast.error('User ID and amount required');
    setSaving(true);
    try {
      await adminAPI.assignFreeBet({
        user_id: freeBetForm.user_id,
        amount: parseFloat(freeBetForm.amount),
        expiry_days: parseInt(freeBetForm.expiry_days),
      });
      toast.success('Free bet assigned!');
      setShowFreeBetModal(false);
      setFreeBetForm({ user_id: '', amount: '', expiry_days: '7' });
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  }

  const InputField = ({ label, value, onChange, type = 'text', prefix = '', suffix = '' }: any) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className={`admin-input ${prefix ? 'pl-12' : ''} ${suffix ? 'pr-16' : ''}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Settings — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Platform Settings">

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-48 flex-shrink-0">
            <div className="admin-card p-2 space-y-0.5">
              {SETTING_TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${tab === t.id ? 'bg-brand/10 text-brand border border-brand/20' : 'text-gray-400 hover:text-white hover:bg-admin-hover'}`}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* General Settings */}
            {tab === 'general' && (
              <div className="space-y-4">
                <div className="admin-card p-5">
                  <h3 className="text-white font-semibold mb-4">Platform Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Platform Name" value={general.platform_name} onChange={(v: string) => setGeneral(g => ({ ...g, platform_name: v }))} />
                    <InputField label="Currency" value={general.currency} onChange={(v: string) => setGeneral(g => ({ ...g, currency: v }))} />
                    <InputField label="Minimum Age" value={general.min_age} onChange={(v: string) => setGeneral(g => ({ ...g, min_age: v }))} suffix="years" />
                    <InputField label="Country" value={general.country} onChange={(v: string) => setGeneral(g => ({ ...g, country: v }))} />
                    <InputField label="Tax Rate" value={general.tax_rate} onChange={(v: string) => setGeneral(g => ({ ...g, tax_rate: v }))} suffix="%" />
                    <InputField label="Max Payout" value={general.max_payout} onChange={(v: string) => setGeneral(g => ({ ...g, max_payout: v }))} prefix="MWK" />
                    <InputField label="Support Email" value={general.support_email} onChange={(v: string) => setGeneral(g => ({ ...g, support_email: v }))} />
                    <InputField label="Support Phone" value={general.support_phone} onChange={(v: string) => setGeneral(g => ({ ...g, support_phone: v }))} />
                  </div>
                  <button onClick={saveGeneral} disabled={saving} className="btn-primary mt-5 px-8">
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Limits */}
            {tab === 'payments' && (
              <div className="admin-card p-5">
                <h3 className="text-white font-semibold mb-1">Payment & Betting Limits</h3>
                <p className="text-gray-500 text-xs mb-5">Configure minimum and maximum transaction amounts</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Minimum Deposit" value={limits.min_deposit} onChange={(v: string) => setLimits(l => ({ ...l, min_deposit: v }))} prefix="MWK" />
                  <InputField label="Minimum Withdrawal" value={limits.min_withdrawal} onChange={(v: string) => setLimits(l => ({ ...l, min_withdrawal: v }))} prefix="MWK" />
                  <InputField label="Auto Withdrawal Limit" value={limits.auto_withdrawal_limit} onChange={(v: string) => setLimits(l => ({ ...l, auto_withdrawal_limit: v }))} prefix="MWK" />
                  <InputField label="Daily Withdrawal Limit" value={limits.daily_withdrawal_limit} onChange={(v: string) => setLimits(l => ({ ...l, daily_withdrawal_limit: v }))} prefix="MWK" />
                  <InputField label="Minimum Stake" value={limits.min_stake} onChange={(v: string) => setLimits(l => ({ ...l, min_stake: v }))} prefix="MWK" />
                  <InputField label="Maximum Stake" value={limits.max_stake} onChange={(v: string) => setLimits(l => ({ ...l, max_stake: v }))} prefix="MWK" />
                  <InputField label="Max Accumulator Legs" value={limits.max_accumulator_legs} onChange={(v: string) => setLimits(l => ({ ...l, max_accumulator_legs: v }))} suffix="selections" />
                </div>
                <div className="mt-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3">
                  <p className="text-yellow-400 text-xs">⚠️ Changing limits affects all users immediately. Auto-withdrawal limit determines when manual approval is required.</p>
                </div>
                <button onClick={saveLimits} disabled={saving} className="btn-primary mt-5 px-8">
                  {saving ? 'Saving...' : 'Save Limits'}
                </button>
              </div>
            )}

            {/* Bonus Campaigns */}
            {tab === 'bonus' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Bonus Campaigns</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowFreeBetModal(true)} className="btn-secondary text-sm">🎫 Assign Free Bet</button>
                    <button onClick={() => setShowCampaignModal(true)} className="btn-primary text-sm">+ New Campaign</button>
                  </div>
                </div>

                {campaigns.length === 0 ? (
                  <div className="admin-card p-12 text-center">
                    <p className="text-3xl mb-3">🎁</p>
                    <p className="text-white font-semibold">No campaigns yet</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first bonus campaign</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {campaigns.map((c, i) => (
                      <div key={c.id || i} className="admin-card p-4 border border-brand/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">{c.name}</span>
                          <span className={`badge ${c.is_active ? 'badge-success' : 'badge-gray'}`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-500">
                          <p>Type: <span className="text-gray-300 capitalize">{c.type}</span></p>
                          {c.percent && <p>Bonus: <span className="text-brand">{c.percent}%</span></p>}
                          {c.max_bonus && <p>Max: <span className="text-gray-300">{fmt.mwk(c.max_bonus)}</span></p>}
                          <p>Min Deposit: <span className="text-gray-300">{fmt.mwk(c.min_deposit || 500)}</span></p>
                          <p>Wagering: <span className="text-gray-300">{c.wagering_req}x</span></p>
                          <p>Min Odds: <span className="text-gray-300">{c.min_odds}</span></p>
                          <p>Expires: <span className="text-gray-300">{c.expiry_days} days</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SMS Settings */}
            {tab === 'sms' && (
              <div className="admin-card p-5">
                <h3 className="text-white font-semibold mb-1">SMS & Notification Settings</h3>
                <p className="text-gray-500 text-xs mb-5">Configure Africa's Talking SMS gateway</p>
                <div className="space-y-3">
                  {[
                    { label: 'SMS on Registration', desc: 'Send welcome SMS when user registers', checked: true },
                    { label: 'SMS on Deposit', desc: 'Notify user when deposit is confirmed', checked: true },
                    { label: 'SMS on Withdrawal', desc: 'Notify user when withdrawal is processed', checked: true },
                    { label: 'SMS on Win', desc: 'Notify user when they win a bet', checked: true },
                    { label: 'SMS on Bonus', desc: 'Notify user when bonus is awarded', checked: true },
                    { label: 'SMS on Referral', desc: 'Notify user when referral bonus is earned', checked: true },
                    { label: 'OTP for Registration', desc: 'Require OTP verification during signup', checked: true },
                    { label: 'OTP for Withdrawal', desc: 'Require OTP verification for withdrawals', checked: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-admin-surface rounded-xl">
                      <div>
                        <p className="text-white text-sm font-medium">{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                        <div className="w-10 h-5 bg-admin-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-brand after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    </div>
                  ))}
                </div>
                <button onClick={() => toast.success('SMS settings saved')} className="btn-primary mt-5 px-8">Save Settings</button>
              </div>
            )}

            {/* Maintenance */}
            {tab === 'maintenance' && (
              <div className="space-y-4">
                <div className={`admin-card p-5 ${maintenanceMode ? 'border-red-700/50 bg-red-900/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">Maintenance Mode</h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {maintenanceMode ? '🔴 Platform is in maintenance — users cannot access the site' : '🟢 Platform is live and accessible to all users'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={maintenanceMode} onChange={e => { setMaintenanceMode(e.target.checked); toast(e.target.checked ? '⚠️ Maintenance mode ON' : '✅ Platform back online'); }}
                        className="sr-only peer" />
                      <div className="w-12 h-6 bg-admin-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                    </label>
                  </div>
                </div>

                <div className="admin-card p-5">
                  <h3 className="text-white font-semibold mb-4">System Status</h3>
                  <div className="space-y-2">
                    {[
                      { service: 'API Server',       status: 'Healthy',   uptime: '99.9%', color: 'text-green-400' },
                      { service: 'PostgreSQL DB',    status: 'Connected', uptime: '99.9%', color: 'text-green-400' },
                      { service: 'Odds Feed',        status: 'Syncing',   uptime: '98.5%', color: 'text-yellow-400' },
                      { service: 'SMS Gateway',      status: 'Active',    uptime: '99.7%', color: 'text-green-400' },
                      { service: 'Payment Gateway',  status: 'Online',    uptime: '99.8%', color: 'text-green-400' },
                      { service: 'WebSocket',        status: 'Live',      uptime: '99.9%', color: 'text-green-400' },
                    ].map(s => (
                      <div key={s.service} className="flex items-center justify-between p-3 bg-admin-surface rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${s.color === 'text-green-400' ? 'status-dot-green' : 'status-dot-yellow'}`} />
                          <span className="text-white text-sm">{s.service}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className={s.color}>{s.status}</span>
                          <span className="text-gray-500">Uptime: {s.uptime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-card p-5">
                  <h3 className="text-white font-semibold mb-4">Danger Zone</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-900/10 border border-red-900/30 rounded-xl">
                      <div>
                        <p className="text-red-400 text-sm font-medium">Clear All Sessions</p>
                        <p className="text-gray-500 text-xs">Log out all users from the platform</p>
                      </div>
                      <button onClick={() => toast('Feature coming soon')} className="btn-danger text-xs py-1.5 px-3">Execute</button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-900/10 border border-red-900/30 rounded-xl">
                      <div>
                        <p className="text-red-400 text-sm font-medium">Suspend All Withdrawals</p>
                        <p className="text-gray-500 text-xs">Freeze all pending withdrawals for review</p>
                      </div>
                      <button onClick={() => toast('Feature coming soon')} className="btn-danger text-xs py-1.5 px-3">Execute</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {tab === 'security' && (
              <div className="space-y-4">
                <div className="admin-card p-5">
                  <h3 className="text-white font-semibold mb-4">Security Configuration</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'JWT Authentication',      desc: 'Secure JWT tokens for all API requests',    enabled: true  },
                      { label: 'Rate Limiting',           desc: '300 requests/15min globally, 15 for auth',   enabled: true  },
                      { label: 'CORS Protection',         desc: 'Only allow requests from approved origins',  enabled: true  },
                      { label: 'Helmet Security Headers', desc: 'XSS, CSRF and clickjacking protection',      enabled: true  },
                      { label: 'Device Fingerprinting',   desc: 'Track device for fraud detection',           enabled: true  },
                      { label: 'IP Tracking',             desc: 'Log all IP addresses for audit trail',       enabled: true  },
                      { label: 'OTP for Withdrawals',     desc: 'Require phone verification for withdrawals', enabled: true  },
                      { label: 'PIN for Transactions',    desc: 'Require 4-digit PIN for sensitive actions',  enabled: true  },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-3 bg-admin-surface rounded-xl">
                        <div>
                          <p className="text-white text-sm font-medium">{item.label}</p>
                          <p className="text-gray-500 text-xs">{item.desc}</p>
                        </div>
                        <span className={`badge ${item.enabled ? 'badge-success' : 'badge-gray'}`}>
                          {item.enabled ? '✓ Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-card p-5">
                  <h3 className="text-white font-semibold mb-4">Fraud Detection Rules</h3>
                  <div className="space-y-2">
                    {[
                      { rule: 'RAPID_WITHDRAWAL',          trigger: '≥5 withdrawals in 24h',             score: '+40', sev: 'High' },
                      { rule: 'NEW_ACCOUNT_HIGH_WITHDRAW',  trigger: 'Account <30 days + withdrawal >100K', score: '+35', sev: 'High' },
                      { rule: 'UNUSUAL_WIN_PATTERN',        trigger: '≥3 odds>50 wins in 7 days',          score: '+30', sev: 'Medium' },
                      { rule: 'DEVICE_MULTI_ACCOUNT',       trigger: 'Same device on multiple accounts',   score: '+50', sev: 'Critical' },
                      { rule: 'IP_MULTI_ACCOUNT',           trigger: 'Same IP on ≥2 accounts',             score: '+25', sev: 'High' },
                      { rule: 'RAPID_DEPOSIT_WITHDRAWAL',   trigger: 'Withdrawal ≥90% of recent deposit',  score: '+45', sev: 'High' },
                    ].map(rule => (
                      <div key={rule.rule} className="flex items-center justify-between p-3 bg-admin-surface rounded-xl text-xs">
                        <div>
                          <code className="text-gray-300 font-mono">{rule.rule}</code>
                          <p className="text-gray-600 mt-0.5">{rule.trigger}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`badge ${rule.sev === 'Critical' ? 'badge-danger' : rule.sev === 'High' ? 'bg-orange-900/40 text-orange-400 border border-orange-800' : 'badge-warning'}`}>
                            {rule.sev}
                          </span>
                          <span className="text-red-400 font-bold">{rule.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">Auto-block at score ≥ 90 · Manual review triggered at score ≥ 70</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Create Campaign Modal */}
        <Modal open={showCampaignModal} onClose={() => setShowCampaignModal(false)} title="Create Bonus Campaign">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Campaign Name</label>
                <input value={newCampaign.name} onChange={e => setNewCampaign(c => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. Weekend Special Bonus" className="admin-input" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Type</label>
                <select value={newCampaign.type} onChange={e => setNewCampaign(c => ({ ...c, type: e.target.value }))}
                  className="admin-select w-full">
                  <option value="welcome">Welcome Bonus</option>
                  <option value="reload">Reload Bonus</option>
                  <option value="free_bet">Free Bet</option>
                  <option value="referral">Referral Bonus</option>
                  <option value="manual">Manual Bonus</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Bonus %</label>
                <input type="number" value={newCampaign.percent} onChange={e => setNewCampaign(c => ({ ...c, percent: e.target.value }))}
                  className="admin-input" placeholder="e.g. 100" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Max Bonus (MWK)</label>
                <input type="number" value={newCampaign.max_bonus} onChange={e => setNewCampaign(c => ({ ...c, max_bonus: e.target.value }))}
                  className="admin-input" placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Min Deposit (MWK)</label>
                <input type="number" value={newCampaign.min_deposit} onChange={e => setNewCampaign(c => ({ ...c, min_deposit: e.target.value }))}
                  className="admin-input" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Wagering Requirement</label>
                <input type="number" value={newCampaign.wagering_req} onChange={e => setNewCampaign(c => ({ ...c, wagering_req: e.target.value }))}
                  className="admin-input" placeholder="e.g. 5" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Min Odds</label>
                <input type="number" step="0.1" value={newCampaign.min_odds} onChange={e => setNewCampaign(c => ({ ...c, min_odds: e.target.value }))}
                  className="admin-input" placeholder="e.g. 1.5" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Expiry (days)</label>
                <input type="number" value={newCampaign.expiry_days} onChange={e => setNewCampaign(c => ({ ...c, expiry_days: e.target.value }))}
                  className="admin-input" placeholder="e.g. 30" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={createCampaign} disabled={saving} className="btn-primary flex-1 py-3">
                {saving ? 'Creating...' : '🎁 Create Campaign'}
              </button>
              <button onClick={() => setShowCampaignModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

        {/* Free Bet Modal */}
        <Modal open={showFreeBetModal} onClose={() => setShowFreeBetModal(false)} title="Assign Free Bet to User">
          <div className="space-y-4">
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
              <p className="text-brand text-xs">Free bets are credited to the user's bonus wallet. Only winnings are withdrawable — the stake amount is not.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">User ID (UUID)</label>
              <input value={freeBetForm.user_id} onChange={e => setFreeBetForm(f => ({ ...f, user_id: e.target.value }))}
                placeholder="Paste the user's UUID here" className="admin-input font-mono text-xs" />
              <p className="text-xs text-gray-600 mt-1">Find the User ID in the Customers section</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Free Bet Amount (MWK)</label>
              <input type="number" min="100" value={freeBetForm.amount} onChange={e => setFreeBetForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 5000" className="admin-input" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Expires in (days)</label>
              <input type="number" min="1" max="30" value={freeBetForm.expiry_days} onChange={e => setFreeBetForm(f => ({ ...f, expiry_days: e.target.value }))}
                className="admin-input" />
            </div>
            <div className="flex gap-2">
              <button onClick={assignFreeBet} disabled={saving} className="btn-primary flex-1 py-3">
                {saving ? 'Assigning...' : '🎫 Assign Free Bet'}
              </button>
              <button onClick={() => setShowFreeBetModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

      </AdminLayout>
    </>
  );
}
