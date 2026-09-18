// AI SDLC Command Center — Live Design System Reference
// Access at: ?ds=true  (toggle via App.tsx url param check)

import { useState } from 'react'

// ─── Re-export shared primitives inline (mirrors App.tsx) ──────────────────

const SvgIcon = ({ d, size = 16, className = '' }: { d: string | string[]; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    running: 'bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.9)]', active: 'bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.9)]',
    completed: 'bg-emerald-400', done: 'bg-emerald-400', connected: 'bg-emerald-400', healthy: 'bg-emerald-400', stable: 'bg-emerald-400',
    idle: 'bg-slate-600', paused: 'bg-slate-600',
    failed: 'bg-red-400', error: 'bg-red-400',
    degraded: 'bg-amber-400', waiting: 'bg-amber-400', beta: 'bg-amber-400',
  }
  const pulse = status === 'running' || status === 'active'
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {pulse && <span className={`animate-ping absolute inset-0 rounded-full opacity-60 ${map[status]}`} />}
      <span className={`relative rounded-full h-2 w-2 ${map[status] || 'bg-slate-600'}`} />
    </span>
  )
}

const Badge = ({ label, variant = 'slate' }: { label: string; variant?: string }) => {
  const v: Record<string, string> = {
    cyan:    'bg-cyan-950/60 text-cyan-300 border-cyan-800/60',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    red:     'bg-red-950/60 text-red-300 border-red-800/60',
    amber:   'bg-amber-950/60 text-amber-300 border-amber-800/60',
    slate:   'bg-[#1E2129] text-[#8892A4] border-[#2A2F3A]',
  }
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border font-mono tracking-wide leading-none ${v[variant]}`}>{label}</span>
}

const Brackets = ({ color = '#06B6D4', size = 7 }: { color?: string; size?: number }) => (
  <>
    <span className="absolute top-0 left-0 border-t border-l pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
    <span className="absolute top-0 right-0 border-t border-r pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
    <span className="absolute bottom-0 left-0 border-b border-l pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
    <span className="absolute bottom-0 right-0 border-b border-r pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
  </>
)

// ─── DS Section wrapper ────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-12">
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">{title}</span>
      <div className="flex-1 h-px bg-[#1E2129]" />
    </div>
    {children}
  </div>
)

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-8 py-3 border-b border-[#1E2129]/60">
    <div className="w-36 shrink-0">
      <span className="text-[11px] text-[#3A4255] font-mono">{label}</span>
    </div>
    <div className="flex items-center flex-wrap gap-3">{children}</div>
  </div>
)

// ─── Color swatch ─────────────────────────────────────────────────────────

const Swatch = ({ hex, label, border = false }: { hex: string; label: string; border?: boolean }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="w-12 h-12 rounded-lg" style={{ background: hex, border: border ? '1px solid #2A2F3A' : 'none' }} />
    <span className="text-[9px] font-mono text-[#3A4255] text-center leading-tight">{hex}<br />{label}</span>
  </div>
)

// ─── Input base (mirrors App.tsx) ─────────────────────────────────────────

const inputBase = 'w-full bg-[#0A0B0D] border border-[#1E2129] rounded-lg px-3 text-[13px] text-[#F1F5F9] placeholder-[#3A4255] outline-none transition-colors focus:border-[#06B6D4]/60 hover:border-[#2A2F3A]'

// ─── Main reference page ─────────────────────────────────────────────────

export default function DesignSystem() {
  const [tab, setTab] = useState<'tokens' | 'components' | 'patterns' | 'motion'>('tokens')
  const [toggleA, setToggleA] = useState(true)
  const [toggleB, setToggleB] = useState(false)
  const [range, setRange] = useState(0.2)
  const [inputVal, setInputVal] = useState('')

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'tokens',     label: 'Tokens & Color' },
    { key: 'components', label: 'Components'      },
    { key: 'patterns',   label: 'Patterns'        },
    { key: 'motion',     label: 'Motion'          },
  ]

  return (
    <div className="h-screen flex flex-col bg-[#0A0B0D] text-[#F1F5F9] overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <SvgIcon d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" size={10} className="text-white" />
          </div>
          <span className="text-sm font-semibold">AI SDLC Command Center</span>
          <span className="text-[#2A2F3A]">·</span>
          <span className="text-[12px] text-[#4A5568]">Design System v1.0</span>
        </div>
        <Badge label="REFERENCE ONLY" variant="slate" />
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 border-b border-[#1E2129] shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#4A5568] hover:text-[#8892A4]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">

        {/* ── TOKENS ── */}
        {tab === 'tokens' && (
          <div className="max-w-4xl">

            <Section title="Background Layers">
              <div className="flex gap-3">
                {[
                  { hex: '#0A0B0D', label: 'Shell / Canvas\nbg-[#0A0B0D]' },
                  { hex: '#0D0F13', label: 'Panels\nbg-[#0D0F13]' },
                  { hex: '#13151A', label: 'Cards\nbg-[#13151A]' },
                  { hex: '#1A1D24', label: 'Hover / Active\nbg-[#1A1D24]' },
                ].map(s => <Swatch key={s.hex} hex={s.hex} label={s.label} border />)}
              </div>
            </Section>

            <Section title="Border Scale">
              <div className="flex gap-3">
                <Swatch hex="#1E2129" label="Primary hairline\nborder-[#1E2129]" border />
                <Swatch hex="#2A2F3A" label="Elevated / hover\nborder-[#2A2F3A]" border />
              </div>
            </Section>

            <Section title="Text Hierarchy">
              <div className="space-y-1.5">
                {[
                  { hex: '#F1F5F9', label: 'Primary text',   class: 'text-[#F1F5F9]',  sample: 'Agent name · Workspace heading · Primary label' },
                  { hex: '#C4CDD8', label: 'Secondary text',  class: 'text-[#C4CDD8]',  sample: 'Entity row text · Form values · Description body' },
                  { hex: '#8892A4', label: 'Muted text',      class: 'text-[#8892A4]',  sample: 'Field labels · Metadata · Button labels' },
                  { hex: '#4A5568', label: 'Dim text',        class: 'text-[#4A5568]',  sample: 'Icon defaults · Hints · Placeholder labels' },
                  { hex: '#3A4255', label: 'Faint text',      class: 'text-[#3A4255]',  sample: 'Timestamps · Log lines · Placeholders' },
                  { hex: '#2A2F3A', label: 'Ultra-faint',     class: 'text-[#2A2F3A]',  sample: 'Canvas decorations · Grid labels' },
                ].map(row => (
                  <div key={row.hex} className="flex items-center gap-4 py-2 border-b border-[#1E2129]/40">
                    <div className="w-4 h-4 rounded shrink-0" style={{ background: row.hex }} />
                    <code className="text-[10px] font-mono text-[#4A5568] w-28 shrink-0">{row.hex}</code>
                    <code className="text-[10px] font-mono text-[#3A4255] w-32 shrink-0">{row.class}</code>
                    <span style={{ color: row.hex }} className="text-[13px]">{row.sample}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Semantic Accent Colors">
              <div className="flex gap-3 mb-4">
                <Swatch hex="#06B6D4" label="Cyan — interactive\naccent only" />
                <Swatch hex="#10B981" label="Emerald — success\nhealthy / done" />
                <Swatch hex="#F59E0B" label="Amber — warning\napprovals / waiting" />
                <Swatch hex="#EF4444" label="Red — danger\nfailed / high-risk" />
                <Swatch hex="#8B5CF6" label="Purple — reserved\nnot yet used" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cyan surface',    bg: 'bg-cyan-950/60',    border: 'border-cyan-800/60',    text: 'text-cyan-300',    sample: 'RUNNING' },
                  { label: 'Emerald surface', bg: 'bg-emerald-950/60', border: 'border-emerald-800/60', text: 'text-emerald-300', sample: 'PUBLISHED' },
                  { label: 'Amber surface',   bg: 'bg-amber-950/60',   border: 'border-amber-800/40',   text: 'text-amber-300',   sample: 'WAITING' },
                  { label: 'Red surface',     bg: 'bg-red-950/60',     border: 'border-red-800/40',     text: 'text-red-300',     sample: 'FAILED' },
                  { label: 'Slate surface',   bg: 'bg-[#1E2129]',      border: 'border-[#2A2F3A]',      text: 'text-[#8892A4]',   sample: 'DRAFT' },
                ].map(s => (
                  <div key={s.label} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${s.bg} ${s.border}`}>
                    <span className="text-[11px] text-[#4A5568]">{s.label}</span>
                    <span className={`text-[10px] font-mono font-medium ${s.text}`}>{s.sample}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Typography Scale">
              {[
                { size: 'text-sm',      px: '14px', weight: '600', sample: 'Workspace heading / Entity name', mono: false  },
                { size: 'text-[13px]',  px: '13px', weight: '400', sample: 'Form inputs · Body text · Description', mono: false },
                { size: 'text-[12px]',  px: '12px', weight: '400', sample: 'Row text · Log lines · Chat messages', mono: false },
                { size: 'text-[11px]',  px: '11px', weight: '400', sample: 'Metadata · Validation messages · Hints', mono: false },
                { size: 'text-[10px]',  px: '10px', weight: '600', sample: 'SECTION LABEL — TRACKING WIDEST', mono: false },
                { size: 'text-[12px]',  px: '12px', weight: '500', sample: 'ses-f4a9 · gpt-4o · agt-002', mono: true  },
                { size: 'text-[10px]',  px: '10px', weight: '400', sample: 'npm test -- --coverage  |  14:23:01', mono: true  },
              ].map((row, i) => (
                <div key={i} className="flex items-baseline gap-4 py-2 border-b border-[#1E2129]/40">
                  <code className="text-[10px] font-mono text-[#3A4255] w-28 shrink-0">{row.size}</code>
                  <code className="text-[10px] font-mono text-[#3A4255] w-8 shrink-0">{row.px}</code>
                  <span className={`${row.size} ${row.mono ? 'font-mono' : ''}`} style={{ fontWeight: parseInt(row.weight) }}>{row.sample}</span>
                  {row.mono && <Badge label="MONO" variant="slate" />}
                </div>
              ))}
            </Section>

          </div>
        )}

        {/* ── COMPONENTS ── */}
        {tab === 'components' && (
          <div className="max-w-4xl">

            <Section title="StatusDot">
              <Row label="All states">
                {['running', 'active', 'completed', 'done', 'connected', 'healthy', 'idle', 'paused', 'waiting', 'failed', 'error', 'degraded'].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <StatusDot status={s} />
                    <span className="text-[11px] text-[#4A5568] font-mono">{s}</span>
                  </div>
                ))}
              </Row>
            </Section>

            <Section title="Badge">
              <Row label="Variants">
                <Badge label="RUNNING"   variant="cyan" />
                <Badge label="PUBLISHED" variant="emerald" />
                <Badge label="FAILED"    variant="red" />
                <Badge label="WAITING"   variant="amber" />
                <Badge label="DRAFT"     variant="slate" />
                <Badge label="BETA"      variant="amber" />
                <Badge label="HIGH RISK" variant="red" />
                <Badge label="v1.3.2"    variant="slate" />
              </Row>
              <Row label="With StatusDot">
                <div className="flex items-center gap-2"><StatusDot status="running" /><Badge label="RUNNING" variant="cyan" /></div>
                <div className="flex items-center gap-2"><StatusDot status="failed"  /><Badge label="FAILED"  variant="red"  /></div>
                <div className="flex items-center gap-2"><StatusDot status="waiting" /><Badge label="APPROVAL NEEDED" variant="amber" /></div>
              </Row>
            </Section>

            <Section title="Brackets">
              <Row label="Cyan (active)">
                <div className="relative px-6 py-4 border border-[#1E2129] rounded-xl bg-[#13151A]">
                  <Brackets color="#06B6D4" size={8} />
                  <span className="text-[12px] text-[#8892A4]">Running agent node</span>
                </div>
              </Row>
              <Row label="Amber (blocked)">
                <div className="relative px-6 py-4 border border-amber-800/40 rounded-xl bg-amber-950/10">
                  <Brackets color="#b45309" size={8} />
                  <span className="text-[12px] text-amber-300">Blocked · awaiting approval</span>
                </div>
              </Row>
            </Section>

            <Section title="Buttons">
              <Row label="Primary (cyan)">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-medium text-[#06B6D4] hover:bg-[#06B6D4]/20 transition-all">
                  <SvgIcon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" size={11} />Publish Agent
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-medium text-[#06B6D4] hover:bg-[#06B6D4]/20 transition-all">
                  <SvgIcon d="M5 3l14 9-14 9V3z" size={11} />Run Session
                </button>
              </Row>
              <Row label="Secondary">
                <button className="px-3 py-1.5 rounded-lg bg-[#13151A] border border-[#2A2F3A] text-[11px] text-[#8892A4] hover:border-[#4A5568] transition-all">Save Draft</button>
                <button className="px-3 py-1.5 rounded-lg bg-[#13151A] border border-[#2A2F3A] text-[11px] text-[#8892A4] hover:border-[#4A5568] transition-all">Clone</button>
              </Row>
              <Row label="Success / Danger">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-400 hover:bg-emerald-950/60 transition-all">
                  <SvgIcon d="M20 6L9 17l-5-5" size={11} />Approve
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-[11px] text-red-400 hover:bg-red-950/60 transition-all">
                  <SvgIcon d="M18 6L6 18M6 6l12 12" size={11} />Reject
                </button>
              </Row>
              <Row label="Ghost">
                <button className="text-[11px] text-[#4A5568] hover:text-[#8892A4] transition-colors px-2 py-1.5">Cancel</button>
              </Row>
              <Row label="Disabled">
                <button disabled className="px-3 py-1.5 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-medium text-[#06B6D4] opacity-30 cursor-not-allowed">Publish Agent</button>
              </Row>
            </Section>

            <Section title="Form Inputs">
              <Row label="Text input">
                <div className="w-64">
                  <input value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="e.g. CodeReviewBot"
                    className={`${inputBase} py-2`} />
                </div>
              </Row>
              <Row label="Error state">
                <div className="w-64">
                  <input placeholder="Required field" className={`${inputBase} py-2 border-red-500/60`} />
                </div>
              </Row>
              <Row label="Mono input">
                <div className="w-64">
                  <input defaultValue="npx -y @mcp/server-github" placeholder="Command"
                    className={`${inputBase} py-2 font-mono text-[12px]`} />
                </div>
              </Row>
              <Row label="Select">
                <div className="w-64">
                  <select className={`${inputBase} py-2 appearance-none cursor-pointer`}>
                    <option>gpt-4o — Flagship, best reasoning</option>
                    <option>gpt-4o-mini — Fast, cost-efficient</option>
                    <option>o1-preview — Advanced reasoning</option>
                  </select>
                </div>
              </Row>
              <Row label="Textarea">
                <div className="w-80">
                  <textarea rows={3} placeholder="System instructions…" className={`${inputBase} py-2 resize-none leading-relaxed`} />
                </div>
              </Row>
              <Row label="Toggle">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setToggleA(!toggleA)} className={`relative w-9 h-5 rounded-full border transition-all ${toggleA ? 'bg-[#06B6D4]/20 border-[#06B6D4]/60' : 'bg-[#13151A] border-[#2A2F3A]'}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${toggleA ? 'left-[18px] bg-[#06B6D4]' : 'left-0.5 bg-[#4A5568]'}`} />
                    </button>
                    <span className="text-[12px] text-[#C4CDD8]">Parallel tool calls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setToggleB(!toggleB)} className={`relative w-9 h-5 rounded-full border transition-all ${toggleB ? 'bg-[#06B6D4]/20 border-[#06B6D4]/60' : 'bg-[#13151A] border-[#2A2F3A]'}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${toggleB ? 'left-[18px] bg-[#06B6D4]' : 'left-0.5 bg-[#4A5568]'}`} />
                    </button>
                    <span className="text-[12px] text-[#C4CDD8]">Require approval</span>
                  </div>
                </div>
              </Row>
              <Row label="Range slider">
                <div className="w-64 flex items-center gap-3">
                  <input type="range" min={0} max={2} step={0.05} value={range} onChange={e => setRange(parseFloat(e.target.value))}
                    className="flex-1 h-1 appearance-none rounded-full bg-[#1E2129] cursor-pointer accent-[#06B6D4]" />
                  <span className="w-10 text-right text-[12px] font-mono text-[#06B6D4]">{range.toFixed(2)}</span>
                </div>
              </Row>
            </Section>

            <Section title="Field + FormSection">
              <div className="max-w-lg">
                <div className="border border-[#1E2129] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#13151A]">
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-[#6B7894]">Basics</span>
                    <SvgIcon d="M18 15l-6-6-6 6" size={13} className="text-[#3A4255]" />
                  </div>
                  <div className="bg-[#0D0F13] px-4 py-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[11px] font-medium text-[#8892A4] uppercase tracking-wider">Agent Name</label>
                        <span className="text-[10px] text-red-400 font-mono">*</span>
                      </div>
                      <input placeholder="e.g. CodeReviewBot" className={`${inputBase} py-2`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[11px] font-medium text-[#8892A4] uppercase tracking-wider">Model</label>
                        <span className="text-[10px] text-red-400 font-mono">*</span>
                      </div>
                      <select className={`${inputBase} py-2 appearance-none`}>
                        <option>gpt-4o — Flagship, best reasoning</option>
                      </select>
                      <p className="mt-1 text-[10px] text-[#3A4255]">The model used for all inference in this agent's sessions</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[11px] font-medium text-[#8892A4] uppercase tracking-wider">System Instructions</label>
                        <span className="text-[10px] text-red-400 font-mono">*</span>
                      </div>
                      <input className={`${inputBase} py-2 border-red-500/60`} placeholder="Required" />
                      <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                        <SvgIcon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4M12 16h.01" size={11} />
                        System instructions are required
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Validation Panel">
              <div className="max-w-xs space-y-1.5">
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-red-950/20 border-red-800/30">
                  <SvgIcon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4M12 16h.01" size={12} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-red-400">Agent name is required</span>
                </div>
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-amber-950/20 border-amber-800/30">
                  <SvgIcon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4M12 17h.01" size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-amber-300">Temperature 1.40 is high — outputs may be inconsistent</span>
                </div>
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-emerald-950/10 border-emerald-800/20">
                  <SvgIcon d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3" size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-emerald-400">3 MCP servers attached</span>
                </div>
              </div>
            </Section>

            <Section title="Entity Row (entity column)">
              <div className="max-w-xs border border-[#1E2129] rounded-xl overflow-hidden">
                {/* Selected row */}
                <div className="bg-[#101318] border-l-2 border-l-[#06B6D4] pl-[10px] pr-3 py-2.5 border-b border-[#1E2129]/40">
                  <div className="flex items-center gap-2 mb-1"><StatusDot status="running" /><span className="text-[12px] font-medium text-[#F1F5F9]">TestOrchestrator</span></div>
                  <div className="text-[10px] text-[#3A4255] font-mono">gpt-4o</div>
                  <div className="text-[10px] text-[#3A4255] mt-0.5">3 MCP · 4 skills · 4m ago</div>
                </div>
                {/* Normal row */}
                <div className="px-3 py-2.5 border-b border-[#1E2129]/40 hover:bg-[#13151A] transition-colors">
                  <div className="flex items-center gap-2 mb-1"><StatusDot status="idle" /><span className="text-[12px] font-medium text-[#C4CDD8]">SecurityScanner</span></div>
                  <div className="text-[10px] text-[#3A4255] font-mono">gpt-4o-mini</div>
                  <div className="text-[10px] text-[#3A4255] mt-0.5">1 MCP · 2 skills · 1h ago</div>
                </div>
                {/* Draft */}
                <div className="px-3 py-2.5 hover:bg-[#13151A] transition-colors">
                  <div className="flex items-center gap-2 mb-1"><StatusDot status="idle" /><span className="text-[12px] font-medium text-[#C4CDD8]">IncidentResponder</span><Badge label="DRAFT" variant="amber" /></div>
                  <div className="text-[10px] text-[#3A4255] font-mono">gpt-4o</div>
                  <div className="text-[10px] text-[#3A4255] mt-0.5">3 MCP · 3 skills · 2d ago</div>
                </div>
              </div>
            </Section>

          </div>
        )}

        {/* ── PATTERNS ── */}
        {tab === 'patterns' && (
          <div className="max-w-4xl space-y-10">

            <Section title="Workspace Header Pattern">
              <div className="border border-[#1E2129] rounded-xl overflow-hidden">
                <div className="h-10 flex items-center justify-between px-5 bg-[#13151A] border-b border-[#1E2129]">
                  <div className="flex items-center gap-3">
                    <StatusDot status="running" />
                    <span className="text-sm font-medium text-[#F1F5F9]">TestOrchestrator Session</span>
                    <span className="font-mono text-[10px] text-[#3A4255] bg-[#0A0B0D] px-2 py-0.5 rounded border border-[#1E2129]">ses-f4a9</span>
                    <span className="text-[11px] font-mono text-[#4A5568]">gpt-4o · 4m 22s · 12 tools</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-[#13151A] border border-[#2A2F3A] text-[#8892A4] hover:border-[#4A5568] transition-all">
                      <span className="w-2 h-2 bg-current rounded-sm" />Stop
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4] hover:bg-[#06B6D4]/20 transition-all">
                      <SvgIcon d="M5 3l14 9-14 9V3z" size={10} />Replay
                    </button>
                  </div>
                </div>
                <div className="flex items-center px-5 bg-[#0D0F13]">
                  {['Trace', 'Output', 'Config'].map((t, i) => (
                    <button key={t} className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors ${i === 0 ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#4A5568]'}`}>{t}</button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Agent Node Card (canvas)">
              <div className="relative rounded-xl border border-[#0891B2] bg-[#13151A] px-5 py-4 w-64 inline-block"
                style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.22), 0 0 0 1px rgba(6,182,212,0.12)' }}>
                <Brackets color="#0891B2" size={8} />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><StatusDot status="running" /><span className="text-[10px] font-mono font-semibold tracking-widest uppercase text-cyan-400">Running</span></div>
                  <span className="text-[10px] font-mono text-[#4A5568]">4m 22s</span>
                </div>
                <div className="text-[15px] font-semibold text-[#F1F5F9] mb-0.5">TestOrchestrator</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-mono text-[#4A5568] bg-[#0D0F13] px-1.5 py-0.5 rounded border border-[#1E2129]">gpt-4o</span>
                  <span className="text-[#1E2129]">·</span>
                  <span className="text-[10px] font-mono text-[#4A5568]">ses-f4a9</span>
                </div>
                <div className="text-[11px] text-[#8892A4] italic mb-3">Analyzing coverage gaps</div>
                <div className="flex items-center justify-between pt-2.5 border-t border-[#1E2129]">
                  <span className="text-[10px] font-mono text-[#4A5568]">12 tools</span>
                  <span className="text-[10px] font-mono text-[#3A4255]">3 subagents</span>
                </div>
              </div>
            </Section>

            <Section title="Creation Mode Menu">
              <div className="w-56 bg-[#13151A] border border-[#2A2F3A] rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1E2129]">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">New Agent</span>
                </div>
                {[
                  { icon: 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2v7h7', label: 'Blank',         sub: 'Start from scratch'      },
                  { icon: 'M4 3h16a1 1 0 011 1v3H3V4a1 1 0 011-1z M4 11h7v9H4z M16 11h4M16 15h4M16 19h4', label: 'From template',  sub: 'Pick a pre-built config' },
                  { icon: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12', label: 'Import / Paste', sub: 'Paste JSON or import'    },
                ].map(m => (
                  <div key={m.label} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[#1A1D24] transition-colors cursor-pointer group">
                    <div className="w-7 h-7 rounded-lg bg-[#0A0B0D] border border-[#1E2129] flex items-center justify-center shrink-0 group-hover:border-[#06B6D4]/30 transition-colors">
                      <SvgIcon d={m.icon} size={13} className="text-[#4A5568] group-hover:text-[#06B6D4] transition-colors" />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-[#C4CDD8]">{m.label}</div>
                      <div className="text-[10px] text-[#3A4255] mt-0.5">{m.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Metric Tile">
              <div className="flex gap-2">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-[#13151A] border-cyan-800/40 cursor-pointer hover:bg-[#1A1D24] transition-all"
                  style={{ boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)' }}>
                  <SvgIcon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" size={13} className="text-cyan-400" />
                  <div><div className="text-[15px] font-bold font-mono text-cyan-300 leading-none">1</div><div className="text-[9px] text-[#3A4255] mt-0.5">Active Sessions</div></div>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-[#13151A] border-amber-800/40 cursor-pointer hover:bg-[#1A1D24] transition-all"
                  style={{ boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)' }}>
                  <SvgIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={13} className="text-amber-400" />
                  <div><div className="text-[15px] font-bold font-mono text-amber-300 leading-none">2</div><div className="text-[9px] text-[#3A4255] mt-0.5">Pending Approvals</div></div>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-[#13151A] border-[#1E2129] cursor-pointer hover:bg-[#1A1D24] hover:border-[#2A2F3A] transition-all group">
                  <SvgIcon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={13} className="text-[#3A4255] group-hover:text-[#6B7894] transition-colors" />
                  <div><div className="text-[15px] font-bold font-mono text-[#F1F5F9] leading-none">5</div><div className="text-[9px] text-[#3A4255] mt-0.5">MCP Servers</div></div>
                </div>
              </div>
            </Section>

            <Section title="Canvas Dot Grid">
              <div className="canvas-dot-grid rounded-xl border border-[#1E2129] h-28 relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(10,11,13,0.6) 100%)' }} />
                <div className="absolute top-2 left-3"><span className="text-[9px] font-mono tracking-widest uppercase text-[#2A2F3A]">Active Fleet · 3 agents</span></div>
              </div>
            </Section>

          </div>
        )}

        {/* ── MOTION ── */}
        {tab === 'motion' && (
          <div className="max-w-3xl">

            <Section title="Animations">
              <div className="space-y-6">

                <Row label="animate-ping\n(StatusDot)">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inset-0 rounded-full bg-cyan-400 opacity-60" />
                      <span className="relative rounded-full h-3 w-3 bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.9)]" />
                    </div>
                    <span className="text-[11px] text-[#4A5568]">Running / Active only</span>
                  </div>
                </Row>

                <Row label="animate-node-ring\n(canvas card)">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-xl border border-cyan-700/20 animate-node-ring" />
                    <div className="w-12 h-12 rounded-xl border border-[#0891B2] bg-[#13151A]" style={{ boxShadow: '0 0 12px rgba(6,182,212,0.3)' }} />
                  </div>
                  <span className="text-[11px] text-[#4A5568]">Running agent nodes only · 2s ease-out infinite</span>
                </Row>

                <Row label="animate-amber-ring\n(blocked card)">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-xl border border-amber-700/30 animate-amber-ring" />
                    <div className="w-12 h-12 rounded-xl border border-amber-700/50 bg-amber-950/20" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.15)' }} />
                  </div>
                  <span className="text-[11px] text-[#4A5568]">Blocked/waiting nodes only · 2.4s ease-out infinite</span>
                </Row>

                <Row label="animate-scanline\n(canvas)">
                  <div className="relative h-16 w-64 canvas-dot-grid rounded-lg border border-[#1E2129] overflow-hidden">
                    <div className="absolute left-0 right-0 h-8 animate-scanline" style={{ background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.06), transparent)' }} />
                  </div>
                  <span className="text-[11px] text-[#4A5568]">Canvas only · 7s linear infinite</span>
                </Row>

                <Row label="animate-bounce\n(typing dots)">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#4A5568] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                  <span className="text-[11px] text-[#4A5568]">Chat typing indicator only</span>
                </Row>

                <Row label="animate-spin\n(loading)">
                  <SvgIcon d="M23 4v6h-6 M20.49 15a9 9 0 11-2.12-9.36L23 10" size={16} className="animate-spin text-[#06B6D4]" />
                  <span className="text-[11px] text-[#4A5568]">Test Connection button during test</span>
                </Row>

              </div>
            </Section>

            <Section title="Transitions">
              <div className="space-y-3 text-[12px] text-[#8892A4]">
                <div className="flex items-start gap-3"><span className="text-[#06B6D4] font-mono shrink-0">transition-colors</span><span>Use on color and border-color changes (hover, focus, active states)</span></div>
                <div className="flex items-start gap-3"><span className="text-[#06B6D4] font-mono shrink-0">transition-all</span><span className="text-red-400/70">DO NOT USE — too broad, causes jank on layout changes</span></div>
                <div className="flex items-start gap-3"><span className="text-[#06B6D4] font-mono shrink-0">duration</span><span>Use Tailwind defaults (150ms). No custom durations unless required.</span></div>
              </div>
            </Section>

          </div>
        )}

      </div>
    </div>
  )
}
