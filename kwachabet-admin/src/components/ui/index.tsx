import { useState } from 'react';
import CountUp from 'react-countup';
import { STATUS_BADGE, fmt } from '../../lib/api';

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  icon: string;
  color?: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
  sub?: string;
  format?: 'number' | 'mwk' | 'plain';
}

export function StatCard({ label, value, prefix = '', suffix = '', icon, color = 'green', sub, format = 'number' }: StatCardProps) {
  const colorMap = {
    green:  { border: 'hover:border-green-500/30',  icon: 'bg-green-900/30 text-green-400',  glow: 'metric-card-green' },
    blue:   { border: 'hover:border-blue-500/30',   icon: 'bg-blue-900/30 text-blue-400',    glow: 'metric-card-blue' },
    red:    { border: 'hover:border-red-500/30',     icon: 'bg-red-900/30 text-red-400',      glow: 'metric-card-red' },
    yellow: { border: 'hover:border-yellow-500/30', icon: 'bg-yellow-900/30 text-yellow-400',glow: 'metric-card-yellow' },
    purple: { border: 'hover:border-purple-500/30', icon: 'bg-purple-900/30 text-purple-400',glow: '' },
  };
  const c = colorMap[color];
  const numVal = parseFloat(String(value || 0));

  return (
    <div className={`stat-card ${c.border} ${c.glow}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${c.icon}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-1">
        {prefix && <span className="text-gray-400 text-sm mb-0.5">{prefix}</span>}
        <span className="text-2xl font-black text-white">
          {format === 'mwk' ? (
            <CountUp end={numVal} duration={1.5} separator="," decimals={2} />
          ) : format === 'number' ? (
            <CountUp end={numVal} duration={1.5} separator="," />
          ) : (
            String(value)
          )}
        </span>
        {suffix && <span className="text-gray-400 text-sm mb-0.5">{suffix}</span>}
      </div>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status?.toLowerCase()] || 'badge-gray';
  return <span className={`badge ${cls} capitalize`}>{status}</span>;
}

// ── Risk Badge ────────────────────────────────────────────────────────────────
export function RiskBadge({ score }: { score: number }) {
  const cls = score >= 70 ? 'badge-danger' : score >= 40 ? 'badge-warning' : 'badge-success';
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Medium' : 'Low Risk';
  return <span className={`badge ${cls}`}>{label} ({score})</span>;
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-32' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="admin-card p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Search & Filter Bar ───────────────────────────────────────────────────────
interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function SearchBar({ value, onChange, placeholder = 'Search...', children }: SearchBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="admin-input pl-9"
        />
      </div>
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-white font-semibold text-lg mb-2">{title}</p>
      {subtitle && <p className="text-gray-500 text-sm max-w-xs">{subtitle}</p>}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, total, onPage }: PaginationProps) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">← Prev</button>
      <span className="text-gray-500 text-sm">{page} / {total}</span>
      <button disabled={page === total} onClick={() => onPage(page + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next →</button>
    </div>
  );
}

// ── Export buttons ────────────────────────────────────────────────────────────
export function ExportButtons({ onCSV, onPDF }: { onCSV: () => void; onPDF: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onCSV} className="btn-secondary text-xs py-1.5 px-3">📥 CSV</button>
      <button onClick={onPDF} className="btn-secondary text-xs py-1.5 px-3">📄 PDF</button>
    </div>
  );
}
