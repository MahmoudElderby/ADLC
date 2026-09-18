import { useState, useEffect, useRef } from 'react'
import DesignSystem from './DesignSystem'

// ─── SVG Icon primitive ────────────────────────────────────────────────────

const SvgIcon = ({
  d, size = 16, className = '',
}: { d: string | string[]; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

// ─── Icon paths ──────────────────────────────────────────────────────────────

const I = {
  command:       'M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z',
  agents:        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
  workflows:     'M22 12h-4l-3 9L9 3l-3 9H2',
  sessions:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  approvals:     'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  artifacts:     ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6'],
  skills:        'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  mcp:           'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  environments:  ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  traces:        'M22 12h-4l-3 9L9 3l-3 9H2',
  settings:      ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  search:        'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  bell:          'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  chevRight:     'M9 18l6-6-6-6',
  chevDown:      'M19 9l-7 7-7-7',
  chevLeft:      'M15 18l-6-6 6-6',
  chevUp:        'M18 15l-6-6-6 6',
  plus:          'M12 5v14M5 12h14',
  play:          'M5 3l14 9-14 9V3z',
  terminal:      'M4 17l6-6-6-6M12 19h8',
  check:         'M20 6L9 17l-5-5',
  x:             'M18 6L6 18M6 6l12 12',
  send:          'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  chat:          'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  filter:        'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  lock:          ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  eye:           'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z',
  externalLink:  'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  zap:           'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  more:          'M12 5h.01M12 12h.01M12 19h.01',
  alertTriangle: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4M12 17h.01',
  link:          'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  activity:      'M22 12h-4l-3 9L9 3l-3 9H2',
  copy:          'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  cpu:           'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
  // Creation pattern icons
  fileBlank:     ['M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z', 'M13 2v7h7'],
  template:      ['M4 3h16a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z', 'M4 11h7a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1z', 'M16 11h4M16 15h4M16 19h4'],
  uploadCloud:   ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  checkCircle:   'M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3',
  alertCircle:   'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4M12 16h.01',
  infoCircle:    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4M12 8h.01',
  sliders:       'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  rotateCw:      'M23 4v6h-6 M20.49 15a9 9 0 11-2.12-9.36L23 10',
  shield:        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  code:          'M16 18l6-6-6-6M8 6l-6 6 6 6',
  toggleRight:   'M16 4H8a6 6 0 100 12h8a6 6 0 100-12z M16 10a2 2 0 11-4 0 2 2 0 014 0z',
  toggleLeft:    'M16 4H8a6 6 0 100 12h8a6 6 0 100-12z M8 10a2 2 0 11-4 0 2 2 0 014 0z',
}

// ─── Types & data ─────────────────────────────────────────────────────────────

type NavSection = 'command' | 'agents' | 'workflows' | 'sessions' | 'approvals' | 'artifacts' | 'skills' | 'mcp' | 'environments' | 'traces' | 'settings'
type ChatState  = 'hidden' | 'collapsed' | 'expanded'
type CreationMode = 'blank' | 'template' | 'import'

interface CreatingEntity { type: NavSection; mode: CreationMode }
interface Subagent { name: string; action: string; tool: string; status: 'running' | 'done' | 'waiting' }
interface Approval { id: string; action: string; risk: 'high' | 'low' }
interface ActiveAgent {
  id: string; name: string; model: string; session: string; status: 'running' | 'waiting'
  elapsed: string; tools: number; activity: string; subagents: Subagent[]; approval: Approval | null
}

const ACTIVE_FLEET: ActiveAgent[] = [
  {
    id: 'agt-002', name: 'TestOrchestrator', model: 'gpt-4o', session: 'ses-f4a9',
    status: 'running', elapsed: '4m 22s', tools: 12, activity: 'Analyzing coverage gaps',
    subagents: [
      { name: 'test-runner',       action: 'Running Jest suite',   tool: 'bash',       status: 'running' },
      { name: 'coverage-analyzer', action: 'Parsing lcov.info',    tool: 'read_file',  status: 'running' },
      { name: 'file-writer',       action: 'Writing test stubs',   tool: 'write_file', status: 'running' },
    ],
    approval: null,
  },
  {
    id: 'agt-004', name: 'DeployCoordinator', model: 'gpt-4o', session: 'ses-d7e2',
    status: 'waiting', elapsed: '2m 41s', tools: 14, activity: 'Awaiting approval to proceed',
    subagents: [
      { name: 'terraform-planner', action: 'Plan ready — blocked', tool: 'terraform', status: 'waiting' },
      { name: 'k8s-checker',       action: 'Manifests validated',  tool: 'kubectl',   status: 'done'    },
    ],
    approval: { id: 'apr-001', action: 'terraform apply — destroy 2 resources in prod-us-east-1', risk: 'high' },
  },
  {
    id: 'agt-005', name: 'DocsWriter', model: 'gpt-4o-mini', session: 'ses-b3c8',
    status: 'waiting', elapsed: '0m 14s', tools: 2, activity: 'Waiting for write approval',
    subagents: [
      { name: 'api-parser', action: 'Extracting endpoint schemas', tool: 'read_file', status: 'running' },
    ],
    approval: { id: 'apr-002', action: 'write_file src/payments/__tests__/webhook.test.ts', risk: 'low' },
  },
]

const SESSIONS = [
  { id: 'ses-f4a9', agent: 'TestOrchestrator',  title: 'Unit test coverage — payments module', status: 'running',   duration: '4m 22s', ts: '14:23:01', tools: 12, tokens: 8420 },
  { id: 'ses-c2b1', agent: 'CodeReviewBot',      title: 'PR #2041 — Stripe webhook refactor',  status: 'completed', duration: '1m 48s', ts: '14:08:33', tools: 7,  tokens: 5210 },
  { id: 'ses-a9f3', agent: 'SecurityScanner',    title: 'Dependency audit — node_modules',     status: 'completed', duration: '3m 07s', ts: '13:51:20', tools: 9,  tokens: 6830 },
  { id: 'ses-d7e2', agent: 'DeployCoordinator',  title: 'Staging deploy — v2.14.0-rc3',        status: 'failed',    duration: '2m 41s', ts: '13:29:44', tools: 14, tokens: 9100 },
  { id: 'ses-b3c8', agent: 'DocsWriter',         title: 'API docs refresh — /v2/accounts',     status: 'waiting',   duration: '0m 14s', ts: '14:27:01', tools: 2,  tokens: 1200 },
]
const AGENTS = [
  { id: 'agt-001', name: 'CodeReviewBot',     model: 'gpt-4o',      status: 'active',  skills: 3, mcp: 2, lastRun: '2m ago',  published: true,  runs: 1247 },
  { id: 'agt-002', name: 'TestOrchestrator',  model: 'gpt-4o',      status: 'running', skills: 4, mcp: 3, lastRun: '4m ago',  published: true,  runs: 892  },
  { id: 'agt-003', name: 'SecurityScanner',   model: 'gpt-4o-mini', status: 'idle',    skills: 2, mcp: 1, lastRun: '1h ago',  published: true,  runs: 340  },
  { id: 'agt-004', name: 'DeployCoordinator', model: 'gpt-4o',      status: 'error',   skills: 5, mcp: 4, lastRun: '23m ago', published: true,  runs: 421  },
  { id: 'agt-005', name: 'DocsWriter',        model: 'gpt-4o-mini', status: 'waiting', skills: 2, mcp: 2, lastRun: '14m ago', published: false, runs: 178  },
  { id: 'agt-006', name: 'IncidentResponder', model: 'gpt-4o',      status: 'idle',    skills: 3, mcp: 3, lastRun: '2d ago',  published: false, runs: 34   },
]
const WORKFLOWS = [
  { id: 'wf-001', name: 'PR Review Pipeline',    agents: 2, status: 'active',  runs: 892, lastRun: '2m ago',  approval: 'auto'     },
  { id: 'wf-002', name: 'Release Gatekeeper',    agents: 3, status: 'running', runs: 124, lastRun: '1h ago',  approval: 'required' },
  { id: 'wf-003', name: 'Nightly Coverage Sweep',agents: 2, status: 'paused',  runs: 47,  lastRun: '22h ago', approval: 'none'     },
  { id: 'wf-004', name: 'SRE Incident Response', agents: 4, status: 'idle',    runs: 12,  lastRun: '3d ago',  approval: 'required' },
]
const APPROVALS = [
  { id: 'apr-001', agent: 'DeployCoordinator', session: 'ses-d7e2', action: 'terraform apply — destroy 2 resources in prod-us-east-1', risk: 'high', ts: '13:31:02' },
  { id: 'apr-002', agent: 'DocsWriter',        session: 'ses-b3c8', action: 'write_file src/payments/__tests__/webhook.test.ts',        risk: 'low',  ts: '14:27:01' },
]
const MCP_SERVERS = [
  { id: 'mcp-001', name: 'github-mcp',     desc: 'GitHub API — PRs, issues, repos, actions', status: 'connected', tools: 24, version: '1.3.2' },
  { id: 'mcp-002', name: 'filesystem-mcp', desc: 'Sandboxed file read/write/search',          status: 'connected', tools: 8,  version: '2.0.1' },
  { id: 'mcp-003', name: 'jest-runner-mcp',desc: 'Run Jest suites and parse coverage',        status: 'connected', tools: 6,  version: '0.9.4' },
  { id: 'mcp-004', name: 'k8s-mcp',        desc: 'Kubernetes cluster operations',             status: 'degraded',  tools: 18, version: '1.1.0' },
  { id: 'mcp-005', name: 'snyk-mcp',       desc: 'Vulnerability scanning and remediation',    status: 'connected', tools: 5,  version: '1.0.8' },
]
const SKILLS = [
  { id: 'sk-001', name: 'code-review',          desc: 'Systematic review with static analysis', agents: 3, version: 'v2.1.0', status: 'stable' },
  { id: 'sk-002', name: 'test-generation',      desc: 'AI-assisted unit test generation',       agents: 2, version: 'v1.4.2', status: 'stable' },
  { id: 'sk-003', name: 'security-scan',        desc: 'SAST/DAST vulnerability detection',      agents: 2, version: 'v1.0.8', status: 'beta'   },
  { id: 'sk-004', name: 'deploy-orchestration', desc: 'Multi-stage deployment with approval',   agents: 1, version: 'v3.0.1', status: 'stable' },
  { id: 'sk-005', name: 'incident-triage',      desc: 'SRE incident detection and response',    agents: 1, version: 'v0.9.3', status: 'beta'   },
]
const ENVIRONMENTS = [
  { id: 'env-001', name: 'prod-us-east-1',    type: 'production',  risk: 'high',   agents: 4,  status: 'healthy'  },
  { id: 'env-002', name: 'staging-us-east-1', type: 'staging',     risk: 'medium', agents: 6,  status: 'healthy'  },
  { id: 'env-003', name: 'ci-sandbox',        type: 'sandbox',     risk: 'low',    agents: 12, status: 'healthy'  },
  { id: 'env-004', name: 'dev-local',         type: 'development', risk: 'low',    agents: 3,  status: 'degraded' },
]
const TRACES = [
  { id: 'trc-001', session: 'ses-f4a9', agent: 'TestOrchestrator',  events: 47, duration: '4m 22s', ts: '14:23:01', status: 'running'   },
  { id: 'trc-002', session: 'ses-c2b1', agent: 'CodeReviewBot',     events: 23, duration: '1m 48s', ts: '14:08:33', status: 'completed' },
  { id: 'trc-003', session: 'ses-d7e2', agent: 'DeployCoordinator', events: 61, duration: '2m 41s', ts: '13:29:44', status: 'failed'    },
]
const TOOL_CALLS = [
  { id: 'tc-001', tool: 'bash',       args: { command: 'npm test -- --coverage --testPathPattern=payments' }, status: 'done',    dur: '18.4s', ts: '14:23:03', result: '247 passed, 12 failed — coverage 67.3%' },
  { id: 'tc-002', tool: 'read_file',  args: { path: 'coverage/lcov.info' },                                  status: 'done',    dur: '0.1s',  ts: '14:23:22', result: '4,218 lines read' },
  { id: 'tc-003', tool: 'read_file',  args: { path: 'src/payments/processor.ts' },                           status: 'done',    dur: '0.1s',  ts: '14:23:24', result: '312 lines read' },
  { id: 'tc-004', tool: 'write_file', args: { path: 'src/payments/__tests__/processor.test.ts' },            status: 'done',    dur: '0.2s',  ts: '14:23:31', result: '89 lines written' },
  { id: 'tc-005', tool: 'write_file', args: { path: 'src/payments/__tests__/webhook.test.ts' },              status: 'done',    dur: '0.2s',  ts: '14:23:38', result: '64 lines written' },
  { id: 'tc-006', tool: 'bash',       args: { command: 'npm test -- --coverage --testPathPattern=payments' }, status: 'running', ts: '14:27:12' },
]
const LOG_LINES = [
  { ts: '14:23:01', type: 'user',   content: 'Run a full unit test coverage sweep on the payments module.' },
  { ts: '14:23:02', type: 'agent',  content: "I'll run the existing tests first to get a baseline, then identify gaps and write missing test cases." },
  { ts: '14:23:03', type: 'tool',   tool: 'bash',       detail: 'npm test -- --coverage --testPathPattern=payments' },
  { ts: '14:23:22', type: 'agent',  content: 'Coverage is 67.3%. Uncovered paths: processor.ts error handling and webhook.ts signature verification.' },
  { ts: '14:23:24', type: 'tool',   tool: 'read_file',  detail: 'src/payments/processor.ts' },
  { ts: '14:23:25', type: 'tool',   tool: 'read_file',  detail: 'src/payments/webhook.ts' },
  { ts: '14:23:30', type: 'agent',  content: 'Identified 3 uncovered branches. Writing tests.' },
  { ts: '14:23:31', type: 'tool',   tool: 'write_file', detail: 'src/payments/__tests__/processor.test.ts' },
  { ts: '14:23:38', type: 'tool',   tool: 'write_file', detail: 'src/payments/__tests__/webhook.test.ts' },
  { ts: '14:27:12', type: 'tool',   tool: 'bash',       detail: 'npm test -- --coverage --testPathPattern=payments' },
  { ts: '14:27:23', type: 'stream', content: 'PASS src/payments/__tests__/processor.test.ts' },
  { ts: '14:27:24', type: 'stream', content: '  ✓ retries exhausted throws PaymentError (12ms)' },
]
const INIT_CHAT: { role: 'user' | 'assistant'; content: string; actions?: string[] }[] = [
  { role: 'user', content: 'What agents are running right now?' },
  {
    role: 'assistant',
    content: '3 agents are currently active:\n\n**TestOrchestrator** (ses-f4a9) — running, analyzing test coverage. 12 tool calls, 4m elapsed.\n\n**DeployCoordinator** (ses-d7e2) — blocked on a high-risk approval for `terraform apply` in prod.\n\n**DocsWriter** (ses-b3c8) — waiting for write approval.',
    actions: ['Open ses-f4a9', 'Open approval', 'View fleet'],
  },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

// ─── Form primitives ──────────────────────────────────────────────────────────

const inputBase = 'w-full bg-[#0A0B0D] border border-[#1E2129] rounded-lg px-3 text-[13px] text-[#F1F5F9] placeholder-[#3A4255] outline-none transition-colors focus:border-[#06B6D4]/60 hover:border-[#2A2F3A]'

const TInput = ({
  value, onChange, placeholder = '', error = false, mono = false, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean; mono?: boolean; type?: string }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className={`${inputBase} py-2 ${error ? 'border-red-500/60 focus:border-red-500/80' : ''} ${mono ? 'font-mono text-[12px]' : ''}`}
  />
)

const TTextarea = ({
  value, onChange, placeholder = '', rows = 4, mono = false, error = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean; error?: boolean }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`${inputBase} py-2 resize-none leading-relaxed ${error ? 'border-red-500/60' : ''} ${mono ? 'font-mono text-[12px]' : ''}`}
  />
)

const TSelect = ({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`${inputBase} py-2 appearance-none cursor-pointer`}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
)

const TToggle = ({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-[12px] text-[#C4CDD8]">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full border transition-all ${checked ? 'bg-[#06B6D4]/20 border-[#06B6D4]/60' : 'bg-[#13151A] border-[#2A2F3A]'}`}
    >
      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${checked ? 'left-[18px] bg-[#06B6D4]' : 'left-0.5 bg-[#4A5568]'}`} />
    </button>
  </div>
)

const RangeInput = ({
  value, onChange, min = 0, max = 1, step = 0.05,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <div className="flex items-center gap-3">
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="flex-1 h-1 appearance-none rounded-full bg-[#1E2129] cursor-pointer accent-[#06B6D4]"
    />
    <span className="w-10 text-right text-[12px] font-mono text-[#06B6D4]">{value.toFixed(2)}</span>
  </div>
)

const Field = ({
  label, required = false, hint, error, children,
}: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-[11px] font-medium text-[#8892A4] uppercase tracking-wider">{label}</label>
      {required && <span className="text-[10px] text-red-400 font-mono">*</span>}
    </div>
    {children}
    {error && <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><SvgIcon d={I.alertCircle} size={11} />{error}</p>}
    {!error && hint && <p className="mt-1 text-[10px] text-[#3A4255]">{hint}</p>}
  </div>
)

const FormSection = ({
  title, icon, children, defaultOpen = true,
}: { title: string; icon?: string | string[]; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#1E2129] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#13151A] hover:bg-[#1A1D24] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon && <SvgIcon d={icon} size={13} className="text-[#4A5568]" />}
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#6B7894]">{title}</span>
        </div>
        <SvgIcon d={open ? I.chevUp : I.chevDown} size={13} className="text-[#3A4255]" />
      </button>
      {open && <div className="bg-[#0D0F13] px-4 py-4 space-y-4">{children}</div>}
    </div>
  )
}

// ─── JSON syntax highlighter ──────────────────────────────────────────────────

function highlightJson(json: string): string {
  return json
    .replace(/("[\w-]+")\s*:/g, '<span style="color:#6B7894">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span style="color:#06B6D4">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#F59E0B">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#10B981">$1</span>')
}

// ─── Creation mode menu ───────────────────────────────────────────────────────

const CREATION_MODES: { mode: CreationMode; icon: string | string[]; label: string; sub: string }[] = [
  { mode: 'blank',    icon: I.fileBlank,    label: 'Blank',          sub: 'Start from scratch'     },
  { mode: 'template', icon: I.template,    label: 'From template',  sub: 'Pick a pre-built config' },
  { mode: 'import',   icon: I.uploadCloud, label: 'Import / Paste', sub: 'Paste JSON or import'   },
]

const CreationModeMenu = ({
  entityLabel, onSelect, onClose,
}: { entityLabel: string; onSelect: (mode: CreationMode) => void; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} className="absolute top-10 right-2 z-30 w-56 bg-[#13151A] border border-[#2A2F3A] rounded-xl shadow-2xl overflow-hidden animate-in">
      <div className="px-3 py-2 border-b border-[#1E2129]">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">New {entityLabel}</span>
      </div>
      {CREATION_MODES.map(({ mode, icon, label, sub }) => (
        <button
          key={mode}
          onClick={() => { onSelect(mode); onClose() }}
          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#1A1D24] transition-colors group text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0A0B0D] border border-[#1E2129] flex items-center justify-center shrink-0 group-hover:border-[#06B6D4]/30 transition-colors">
            <SvgIcon d={icon} size={13} className="text-[#4A5568] group-hover:text-[#06B6D4] transition-colors" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-[#C4CDD8]">{label}</div>
            <div className="text-[10px] text-[#3A4255] mt-0.5">{sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Agent templates ──────────────────────────────────────────────────────────

const AGENT_TEMPLATES = [
  {
    id: 'tmpl-code-reviewer',
    name: 'Code Reviewer',
    desc: 'Systematic PR review with static analysis and security checks',
    model: 'gpt-4o',
    instructions: 'You are an expert code reviewer. Analyze pull requests for correctness, security vulnerabilities, code style, and performance. Provide specific, actionable feedback with line references. Flag high-risk changes clearly.',
    role: 'Code Review Specialist',
    mcpServers: ['mcp-001', 'mcp-002'],
    skills: ['sk-001', 'sk-003'],
    temperature: 0.1,
    approvalPolicy: 'none',
  },
  {
    id: 'tmpl-qa-engineer',
    name: 'QA Engineer',
    desc: 'Automated test generation and coverage improvement',
    model: 'gpt-4o',
    instructions: 'You are a senior QA engineer specializing in test automation. Generate comprehensive unit, integration, and edge-case tests. Prioritize coverage of error paths, boundary conditions, and security scenarios.',
    role: 'Quality Assurance Engineer',
    mcpServers: ['mcp-002', 'mcp-003'],
    skills: ['sk-002'],
    temperature: 0.2,
    approvalPolicy: 'file-writes',
  },
  {
    id: 'tmpl-sre',
    name: 'SRE Incident Responder',
    desc: 'Incident detection, triage, and remediation coordination',
    model: 'gpt-4o',
    instructions: 'You are an experienced SRE. Diagnose production incidents, identify root causes, coordinate remediation steps, and write clear incident reports. Escalate to humans for destructive actions.',
    role: 'Site Reliability Engineer',
    mcpServers: ['mcp-001', 'mcp-004'],
    skills: ['sk-005'],
    temperature: 0.15,
    approvalPolicy: 'all-writes',
  },
]

// ─── Validation panel ─────────────────────────────────────────────────────────

interface ValidationItem { kind: 'error' | 'warning' | 'ok'; message: string }

const ValidationPanel = ({ items }: { items: ValidationItem[] }) => {
  const errors   = items.filter(i => i.kind === 'error')
  const warnings = items.filter(i => i.kind === 'warning')
  const oks      = items.filter(i => i.kind === 'ok')

  const row = (item: ValidationItem, idx: number) => {
    const cfg = {
      error:   { icon: I.alertCircle, color: 'text-red-400',     bg: 'bg-red-950/20 border-red-800/30'     },
      warning: { icon: I.alertTriangle, color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-800/30' },
      ok:      { icon: I.checkCircle, color: 'text-emerald-400', bg: 'bg-emerald-950/10 border-emerald-800/20' },
    }[item.kind]
    return (
      <div key={idx} className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${cfg.bg}`}>
        <SvgIcon d={cfg.icon} size={12} className={`${cfg.color} shrink-0 mt-0.5`} />
        <span className={`text-[11px] leading-relaxed ${cfg.color}`}>{item.message}</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {errors.map((e, i) => row(e, i))}
      {warnings.map((w, i) => row(w, i + 100))}
      {oks.map((o, i) => row(o, i + 200))}
    </div>
  )
}

// ─── New Agent Form ───────────────────────────────────────────────────────────

type AgentDraft = {
  name: string; model: string; role: string; instructions: string
  temperature: number; maxTokens: number; parallelToolCalls: boolean
  approvalPolicy: string; environment: string
  mcpServers: string[]; skills: string[]
}

const BLANK_AGENT: AgentDraft = {
  name: '', model: 'gpt-4o', role: '', instructions: '',
  temperature: 0.2, maxTokens: 32000, parallelToolCalls: true,
  approvalPolicy: 'file-writes', environment: 'ci-sandbox',
  mcpServers: [], skills: [],
}

const NewAgentForm = ({ mode, onCancel, onPublish }: { mode: CreationMode; onCancel: () => void; onPublish: (name: string) => void }) => {
  const [step, setStep] = useState<'pick-template' | 'form'>(mode === 'template' ? 'pick-template' : 'form')
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<AgentDraft>(BLANK_AGENT)
  const up = (patch: Partial<AgentDraft>) => setDraft(d => ({ ...d, ...patch }))

  const applyTemplate = (t: typeof AGENT_TEMPLATES[0]) => {
    up({ name: t.name, model: t.model, role: t.role, instructions: t.instructions, temperature: t.temperature, approvalPolicy: t.approvalPolicy, mcpServers: t.mcpServers, skills: t.skills })
    setStep('form')
  }

  const parseImport = () => {
    try {
      const parsed = JSON.parse(importJson)
      up({ name: parsed.name || '', model: parsed.model || 'gpt-4o', instructions: parsed.instructions || '', role: parsed.metadata?.role || '' })
      setImportError('')
      setStep('form')
    } catch {
      setImportError('Invalid JSON — check syntax and try again')
    }
  }

  // Validation
  const validItems: ValidationItem[] = [
    ...(!draft.name ? [{ kind: 'error' as const, message: 'Agent name is required' }] : [{ kind: 'ok' as const, message: 'Agent name set' }]),
    ...(!draft.instructions ? [{ kind: 'error' as const, message: 'System instructions are required' }] : [{ kind: 'ok' as const, message: 'Instructions configured' }]),
    ...(draft.temperature > 0.7 ? [{ kind: 'warning' as const, message: `Temperature ${draft.temperature.toFixed(2)} is high — outputs may be inconsistent` }] : []),
    ...(draft.approvalPolicy === 'none' && draft.environment === 'prod-us-east-1' ? [{ kind: 'warning' as const, message: 'No approval policy in production environment' }] : []),
    ...(draft.mcpServers.length === 0 ? [{ kind: 'warning' as const, message: 'No MCP servers attached — agent cannot use external tools' }] : [{ kind: 'ok' as const, message: `${draft.mcpServers.length} MCP server${draft.mcpServers.length > 1 ? 's' : ''} attached` }]),
    ...(draft.skills.length > 0 ? [{ kind: 'ok' as const, message: `${draft.skills.length} skill${draft.skills.length > 1 ? 's' : ''} configured` }] : []),
    ...(draft.name && draft.instructions ? [{ kind: 'ok' as const, message: `Ready to publish` }] : []),
  ]
  const errors = validItems.filter(i => i.kind === 'error')
  const canPublish = errors.length === 0

  // JSON payload preview
  const payload = {
    name: draft.name || '(unnamed)',
    model: draft.model,
    instructions: draft.instructions || '(not set)',
    parallel_tool_calls: draft.parallelToolCalls,
    tools: draft.mcpServers.map(id => ({ type: 'mcp', server_label: MCP_SERVERS.find(m => m.id === id)?.name || id })),
    metadata: {
      role: draft.role || undefined,
      environment: draft.environment,
      approval_policy: draft.approvalPolicy,
      skills: draft.skills,
    },
  }
  const payloadJson = JSON.stringify(payload, null, 2)

  const copyPayload = () => { navigator.clipboard.writeText(payloadJson); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  // Template picker step
  if (step === 'pick-template') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#F1F5F9]">New Agent</span>
            <Badge label="TEMPLATE" variant="cyan" />
          </div>
          <button onClick={onCancel} className="text-[11px] text-[#4A5568] hover:text-[#8892A4] transition-colors">Cancel</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-[#4A5568] mb-4">Choose a template</div>
          <div className="space-y-3 max-w-xl">
            {AGENT_TEMPLATES.map(t => (
              <div key={t.id} onClick={() => applyTemplate(t)}
                className="relative border border-[#1E2129] rounded-xl p-4 cursor-pointer hover:border-[#06B6D4]/40 hover:bg-[#13151A] transition-all group">
                <Brackets color="#06B6D4" size={6} />
                <div className="text-[13px] font-semibold text-[#F1F5F9] mb-1">{t.name}</div>
                <div className="text-[11px] text-[#6B7894] mb-3">{t.desc}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={t.model} variant="slate" />
                  {t.mcpServers.length > 0 && <Badge label={`${t.mcpServers.length} MCP`} variant="slate" />}
                  {t.skills.length > 0 && <Badge label={`${t.skills.length} skills`} variant="slate" />}
                </div>
                <SvgIcon d={I.chevRight} size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2A2F3A] group-hover:text-[#06B6D4] transition-colors" />
              </div>
            ))}
            <div onClick={() => setStep('form')}
              className="border border-dashed border-[#2A2F3A] rounded-xl p-4 cursor-pointer hover:border-[#4A5568] transition-colors">
              <div className="text-[12px] text-[#4A5568]">Start from blank instead</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Import step
  if (mode === 'import' && !draft.name) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#F1F5F9]">New Agent</span>
            <Badge label="IMPORT" variant="cyan" />
          </div>
          <button onClick={onCancel} className="text-[11px] text-[#4A5568] hover:text-[#8892A4] transition-colors">Cancel</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-xl space-y-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase text-[#4A5568]">Paste OpenAI Agent JSON</div>
            <TTextarea value={importJson} onChange={setImportJson} placeholder={`{\n  "name": "MyAgent",\n  "model": "gpt-4o",\n  "instructions": "..."\n}`} rows={10} mono error={!!importError} />
            {importError && <p className="text-[11px] text-red-400 flex items-center gap-1"><SvgIcon d={I.alertCircle} size={11} />{importError}</p>}
            <div className="flex gap-2">
              <button onClick={parseImport} disabled={!importJson.trim()} className="px-4 py-2 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[12px] text-[#06B6D4] font-medium hover:bg-[#06B6D4]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                Parse & Import
              </button>
              <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-[#13151A] border border-[#2A2F3A] text-[12px] text-[#8892A4] hover:border-[#4A5568] transition-all">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main form
  const toggleMcp = (id: string) => up({ mcpServers: draft.mcpServers.includes(id) ? draft.mcpServers.filter(s => s !== id) : [...draft.mcpServers, id] })
  const toggleSkill = (id: string) => up({ skills: draft.skills.includes(id) ? draft.skills.filter(s => s !== id) : [...draft.skills, id] })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#F1F5F9]">{draft.name || 'New Agent'}</span>
          <Badge label={saved ? 'DRAFT SAVED' : 'UNSAVED'} variant={saved ? 'emerald' : 'amber'} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[11px] text-[#4A5568] hover:text-[#8892A4] transition-colors">Cancel</button>
          <button onClick={() => setSaved(true)} className="px-3 py-1.5 rounded-lg bg-[#13151A] border border-[#2A2F3A] text-[11px] text-[#8892A4] hover:border-[#4A5568] transition-all">Save Draft</button>
          <button
            onClick={() => canPublish && onPublish(draft.name)}
            disabled={!canPublish}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-medium text-[#06B6D4] hover:bg-[#06B6D4]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <SvgIcon d={I.zap} size={11} />Publish Agent
          </button>
        </div>
      </div>

      {/* Body: form left, review right */}
      <div className="flex-1 flex overflow-hidden">

        {/* Form panel */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">

          <FormSection title="Basics" icon={I.infoCircle} defaultOpen>
            <Field label="Agent Name" required error={!draft.name && draft.name !== '' ? undefined : undefined}>
              <TInput value={draft.name} onChange={v => up({ name: v })} placeholder="e.g. CodeReviewBot" error={draft.name === '' && saved} />
              {!draft.name && <p className="mt-1 text-[11px] text-red-400/70">Required</p>}
            </Field>
            <Field label="Model" required hint="The model used for all inference in this agent's sessions">
              <TSelect value={draft.model} onChange={v => up({ model: v })} options={[
                { value: 'gpt-4o',       label: 'gpt-4o — Flagship, best reasoning' },
                { value: 'gpt-4o-mini',  label: 'gpt-4o-mini — Fast, cost-efficient' },
                { value: 'gpt-4-turbo',  label: 'gpt-4-turbo — High context, 128k' },
                { value: 'o1-preview',   label: 'o1-preview — Advanced reasoning' },
              ]} />
            </Field>
            <Field label="Role / Persona" hint="Short description used in session logs and team dashboards">
              <TInput value={draft.role} onChange={v => up({ role: v })} placeholder="e.g. Code Review Specialist" />
            </Field>
            <Field label="System Instructions" required hint="The agent's core behavior directive. Be specific about scope, escalation, and output format.">
              <TTextarea
                value={draft.instructions}
                onChange={v => up({ instructions: v })}
                placeholder={"You are an expert code reviewer. Analyze pull requests for correctness, security vulnerabilities, and style.\n\nAlways provide specific, actionable feedback with line references. Flag high-risk changes clearly and escalate to a human for production deploys."}
                rows={6}
                error={!draft.instructions && saved}
              />
              {!draft.instructions && <p className="mt-1 text-[11px] text-red-400/70">Required</p>}
            </Field>
          </FormSection>

          <FormSection title="Capabilities" icon={I.cpu}>
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568] mb-2">MCP Servers</div>
              <div className="space-y-1.5">
                {MCP_SERVERS.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${draft.mcpServers.includes(m.id) ? 'border-[#06B6D4]/40 bg-[#06B6D4]/5' : 'border-[#1E2129] hover:border-[#2A2F3A]'}`}>
                    <input type="checkbox" checked={draft.mcpServers.includes(m.id)} onChange={() => toggleMcp(m.id)} className="accent-[#06B6D4]" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <StatusDot status={m.status} />
                      <span className="text-[12px] font-mono text-[#C4CDD8] truncate">{m.name}</span>
                      <span className="text-[10px] text-[#3A4255] truncate hidden sm:block">{m.desc}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#3A4255] shrink-0">{m.tools} tools</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568] mb-2">Skills</div>
              <div className="space-y-1.5">
                {SKILLS.map(s => (
                  <label key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${draft.skills.includes(s.id) ? 'border-[#06B6D4]/40 bg-[#06B6D4]/5' : 'border-[#1E2129] hover:border-[#2A2F3A]'}`}>
                    <input type="checkbox" checked={draft.skills.includes(s.id)} onChange={() => toggleSkill(s.id)} className="accent-[#06B6D4]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono text-[#C4CDD8]">{s.name}</span>
                        <Badge label={s.status} variant={s.status === 'stable' ? 'emerald' : 'amber'} />
                      </div>
                      <div className="text-[10px] text-[#3A4255] truncate mt-0.5">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection title="Runtime Config" icon={I.sliders} defaultOpen={false}>
            <Field label="Temperature" hint="Controls output randomness. Lower values (0.0–0.3) are more deterministic.">
              <RangeInput value={draft.temperature} onChange={v => up({ temperature: v })} min={0} max={2} step={0.05} />
            </Field>
            <Field label="Max Output Tokens">
              <TInput value={String(draft.maxTokens)} onChange={v => up({ maxTokens: parseInt(v) || 0 })} type="number" placeholder="32000" />
            </Field>
            <TToggle checked={draft.parallelToolCalls} onChange={v => up({ parallelToolCalls: v })} label="Parallel tool calls" />
            <Field label="Approval Policy" hint="When the agent must wait for human approval before executing an action">
              <TSelect value={draft.approvalPolicy} onChange={v => up({ approvalPolicy: v })} options={[
                { value: 'none',       label: 'None — Agent acts autonomously' },
                { value: 'file-writes',label: 'File writes > 500 lines' },
                { value: 'all-writes', label: 'All write operations' },
                { value: 'always',     label: 'All tool calls' },
              ]} />
            </Field>
          </FormSection>

          <FormSection title="Environment" icon={I.environments} defaultOpen={false}>
            <Field label="Default Environment Profile" hint="The environment this agent runs in by default. Can be overridden per session.">
              <TSelect value={draft.environment} onChange={v => up({ environment: v })} options={
                ENVIRONMENTS.map(e => ({ value: e.id, label: `${e.name} (${e.type}, ${e.risk} risk)` }))
              } />
            </Field>
            {draft.environment === 'env-001' && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-800/40 bg-amber-950/20">
                <SvgIcon d={I.alertTriangle} size={12} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-amber-300">Production environment selected. Ensure approval policy is configured appropriately.</span>
              </div>
            )}
          </FormSection>

        </div>

        {/* Review panel */}
        <div className="w-72 flex flex-col border-l border-[#1E2129] shrink-0 overflow-hidden">

          {/* Validation */}
          <div className="px-4 pt-4 pb-3 border-b border-[#1E2129]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">Validation</span>
              <div className="flex gap-1">
                {errors.length > 0 && <Badge label={`${errors.length} error`} variant="red" />}
                {validItems.filter(i => i.kind === 'warning').length > 0 && <Badge label={`${validItems.filter(i => i.kind === 'warning').length} warn`} variant="amber" />}
              </div>
            </div>
            <ValidationPanel items={validItems} />
          </div>

          {/* JSON preview */}
          <div className="flex-1 flex flex-col overflow-hidden px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">API Payload</span>
              <button onClick={copyPayload} className="flex items-center gap-1 text-[10px] text-[#3A4255] hover:text-[#8892A4] transition-colors">
                <SvgIcon d={copied ? I.check : I.copy} size={11} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg bg-[#0A0B0D] border border-[#1E2129] p-3">
              <pre
                className="text-[10px] leading-5 whitespace-pre-wrap break-all"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                dangerouslySetInnerHTML={{ __html: highlightJson(payloadJson) }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── New MCP Server Form ──────────────────────────────────────────────────────

type McpDraft = { label: string; transport: string; command: string; args: string; serverUrl: string; envVars: string; allowedTools: string; requireApproval: boolean }
const BLANK_MCP: McpDraft = { label: '', transport: 'stdio', command: '', args: '', serverUrl: '', envVars: '', allowedTools: 'all', requireApproval: false }

const NewMcpServerForm = ({ onCancel, onSave }: { onCancel: () => void; onSave: (label: string) => void }) => {
  const [draft, setDraft] = useState<McpDraft>(BLANK_MCP)
  const up = (p: Partial<McpDraft>) => setDraft(d => ({ ...d, ...p }))
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [copied, setCopied] = useState(false)

  const runTest = () => {
    setTestStatus('testing')
    setTimeout(() => setTestStatus(draft.serverUrl || draft.command ? 'ok' : 'fail'), 1500)
  }

  const validItems: ValidationItem[] = [
    ...(!draft.label ? [{ kind: 'error' as const, message: 'Server label is required' }] : [{ kind: 'ok' as const, message: 'Label set' }]),
    ...(draft.transport === 'stdio' && !draft.command ? [{ kind: 'error' as const, message: 'Startup command is required for stdio transport' }] : []),
    ...(draft.transport === 'sse' && !draft.serverUrl ? [{ kind: 'error' as const, message: 'Server URL is required for SSE transport' }] : []),
    ...(draft.transport === 'sse' && draft.serverUrl && !draft.serverUrl.startsWith('https') ? [{ kind: 'warning' as const, message: 'Non-HTTPS server URL — connection is not encrypted' }] : []),
    ...(testStatus === 'ok' ? [{ kind: 'ok' as const, message: 'Connection test passed' }] : []),
    ...(testStatus === 'fail' ? [{ kind: 'error' as const, message: 'Connection test failed — check config' }] : []),
    ...(!draft.requireApproval ? [{ kind: 'warning' as const, message: 'Tool calls from this server will not require approval' }] : []),
  ]
  const canSave = validItems.filter(i => i.kind === 'error').length === 0

  const payload = {
    label: draft.label || '(unnamed)',
    transport: draft.transport,
    ...(draft.transport === 'stdio' ? { command: draft.command, args: draft.args ? draft.args.split(' ') : [] } : { url: draft.serverUrl }),
    require_approval: draft.requireApproval,
    allowed_tools: draft.allowedTools === 'all' ? '*' : draft.allowedTools.split(',').map(t => t.trim()),
  }
  const payloadJson = JSON.stringify(payload, null, 2)
  const copy = () => { navigator.clipboard.writeText(payloadJson); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#F1F5F9]">{draft.label || 'New MCP Server'}</span>
          <Badge label="UNSAVED" variant="amber" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[11px] text-[#4A5568] hover:text-[#8892A4] transition-colors">Cancel</button>
          <button onClick={runTest}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${testStatus === 'ok' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400' : testStatus === 'fail' ? 'bg-red-950/30 border-red-800/40 text-red-400' : 'bg-[#13151A] border-[#2A2F3A] text-[#8892A4] hover:border-[#4A5568]'}`}>
            <SvgIcon d={testStatus === 'testing' ? I.rotateCw : testStatus === 'ok' ? I.check : I.link} size={11} className={testStatus === 'testing' ? 'animate-spin' : ''} />
            {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? 'Connected' : testStatus === 'fail' ? 'Failed' : 'Test Connection'}
          </button>
          <button onClick={() => canSave && onSave(draft.label)} disabled={!canSave}
            className="px-3 py-1.5 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-medium text-[#06B6D4] hover:bg-[#06B6D4]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Save & Attach
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          <FormSection title="Connection" icon={I.link} defaultOpen>
            <Field label="Server Label" required hint="Unique name used in agent configs and logs">
              <TInput value={draft.label} onChange={v => up({ label: v })} placeholder="e.g. github-mcp" mono />
            </Field>
            <Field label="Transport" required>
              <TSelect value={draft.transport} onChange={v => up({ transport: v })} options={[
                { value: 'stdio', label: 'stdio — Local subprocess (most common)' },
                { value: 'sse',   label: 'SSE — Remote server via HTTP' },
              ]} />
            </Field>
            {draft.transport === 'stdio' && (
              <>
                <Field label="Startup Command" required hint="Command to launch the MCP server process">
                  <TInput value={draft.command} onChange={v => up({ command: v })} placeholder="npx -y @modelcontextprotocol/server-github" mono />
                </Field>
                <Field label="Args" hint="Additional CLI arguments, space-separated">
                  <TInput value={draft.args} onChange={v => up({ args: v })} placeholder="--port 3000" mono />
                </Field>
              </>
            )}
            {draft.transport === 'sse' && (
              <Field label="Server URL" required hint="Full HTTPS URL of the MCP SSE endpoint">
                <TInput value={draft.serverUrl} onChange={v => up({ serverUrl: v })} placeholder="https://mcp.internal.acme.com/sse" mono />
              </Field>
            )}
          </FormSection>
          <FormSection title="Environment & Secrets" icon={I.shield} defaultOpen={false}>
            <Field label="Environment Variables" hint="KEY=VALUE pairs, one per line. Values are stored as secrets.">
              <TTextarea value={draft.envVars} onChange={v => up({ envVars: v })} placeholder="GITHUB_TOKEN=...\nGITHUB_ORG=acme-corp" mono rows={4} />
            </Field>
          </FormSection>
          <FormSection title="Permissions" icon={I.lock} defaultOpen={false}>
            <Field label="Allowed Tools" hint="Comma-separated tool names, or * for all">
              <TInput value={draft.allowedTools} onChange={v => up({ allowedTools: v })} placeholder="* or list_prs,get_file,create_issue" mono />
            </Field>
            <TToggle checked={draft.requireApproval} onChange={v => up({ requireApproval: v })} label="Require approval for all tool calls" />
          </FormSection>
        </div>

        <div className="w-72 flex flex-col border-l border-[#1E2129] shrink-0 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#1E2129]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">Validation</span>
              {validItems.filter(i => i.kind === 'error').length > 0 && <Badge label={`${validItems.filter(i => i.kind === 'error').length} error`} variant="red" />}
            </div>
            <ValidationPanel items={validItems} />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">MCP Config</span>
              <button onClick={copy} className="flex items-center gap-1 text-[10px] text-[#3A4255] hover:text-[#8892A4] transition-colors">
                <SvgIcon d={copied ? I.check : I.copy} size={11} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg bg-[#0A0B0D] border border-[#1E2129] p-3">
              <pre className="text-[10px] leading-5 whitespace-pre-wrap break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}
                dangerouslySetInnerHTML={{ __html: highlightJson(payloadJson) }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Generic creation form ────────────────────────────────────────────────────

const GENERIC_FIELDS: Partial<Record<NavSection, { label: string; fields: { key: string; label: string; required?: boolean; hint?: string; type?: string }[] }>> = {
  workflows: {
    label: 'Workflow', fields: [
      { key: 'name',   label: 'Workflow Name', required: true, hint: 'Used in run history and notifications'    },
      { key: 'desc',   label: 'Description',                   hint: 'What does this workflow orchestrate?'      },
      { key: 'trigger',label: 'Trigger',       required: true, hint: 'github:pull_request, cron: 0 2 * * *, manual' },
    ],
  },
  skills: {
    label: 'Skill', fields: [
      { key: 'name',    label: 'Skill Name',    required: true, hint: 'Lowercase, hyphenated. e.g. code-review'  },
      { key: 'version', label: 'Version',       required: true, hint: 'Semver. e.g. v1.0.0'                       },
      { key: 'desc',    label: 'Description',                   hint: 'What capability does this skill add?'       },
    ],
  },
  environments: {
    label: 'Environment', fields: [
      { key: 'name', label: 'Environment Name', required: true, hint: 'e.g. prod-us-east-1, ci-sandbox'   },
      { key: 'type', label: 'Type',             required: true, hint: 'production, staging, sandbox, development' },
    ],
  },
  sessions: {
    label: 'Session', fields: [
      { key: 'title', label: 'Session Title', required: true, hint: 'Brief description of the task'    },
      { key: 'agent', label: 'Agent',         required: true, hint: 'Which agent will run this session' },
    ],
  },
}

const GenericCreationForm = ({ type, onCancel, onSave }: { type: NavSection; onCancel: () => void; onSave: (name: string) => void }) => {
  const config = GENERIC_FIELDS[type]
  const label = config?.label || type
  const [values, setValues] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setValues(p => ({ ...p, [k]: v }))
  const required = config?.fields.filter(f => f.required) || []
  const canSave = required.every(f => values[f.key]?.trim())

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#F1F5F9]">New {label}</span>
          <Badge label="UNSAVED" variant="amber" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[11px] text-[#4A5568] hover:text-[#8892A4] transition-colors">Cancel</button>
          <button onClick={() => canSave && onSave(values[config?.fields[0].key || ''] || label)} disabled={!canSave}
            className="px-3 py-1.5 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-medium text-[#06B6D4] hover:bg-[#06B6D4]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Create {label}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-xl space-y-3">
          <FormSection title={`${label} Details`} defaultOpen>
            {(config?.fields || []).map(f => (
              <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
                <TInput value={values[f.key] || ''} onChange={v => set(f.key, v)} placeholder="" type={f.type} />
              </Field>
            ))}
          </FormSection>
          {!config && (
            <div className="text-[12px] text-[#4A5568] px-2">No creation form configured for this entity type.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Creation workspace ───────────────────────────────────────────────────────

const CreationWorkspace = ({
  creating, onCancel, onComplete,
}: { creating: CreatingEntity; onCancel: () => void; onComplete: (name: string) => void }) => {
  if (creating.type === 'agents') return <NewAgentForm mode={creating.mode} onCancel={onCancel} onPublish={onComplete} />
  if (creating.type === 'mcp')    return <NewMcpServerForm onCancel={onCancel} onSave={onComplete} />
  return <GenericCreationForm type={creating.type} onCancel={onCancel} onSave={onComplete} />
}

// ─── Command Palette ──────────────────────────────────────────────────────────

const CommandPalette = ({ onClose }: { onClose: () => void }) => {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const cmds = [
    { label: 'New Session',            sub: 'Start an agent run',            section: 'Actions', icon: I.play      },
    { label: 'Create Agent',           sub: 'Configure a new AI agent',      section: 'Actions', icon: I.plus      },
    { label: 'ses-f4a9 — TestOrch…',   sub: 'Session · running · 4m 22s',   section: 'Recent',  icon: I.sessions  },
    { label: 'PR Review Pipeline',     sub: 'Workflow · last run 2m ago',    section: 'Recent',  icon: I.workflows },
    { label: 'Open Approval apr-001',  sub: 'High risk · DeployCoordinator', section: 'Pending', icon: I.approvals },
    { label: 'Open Approval apr-002',  sub: 'Low risk · DocsWriter',         section: 'Pending', icon: I.approvals },
  ]
  const filtered = q ? cmds.filter(c => c.label.toLowerCase().includes(q.toLowerCase())) : cmds
  const secs = [...new Set(filtered.map(c => c.section))]
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-[#13151A] border border-[#2A2F3A] rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1E2129]">
          <SvgIcon d={I.search} size={15} className="text-[#4A5568] shrink-0" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents, sessions, workflows…" className="flex-1 bg-transparent text-[#F1F5F9] text-sm outline-none placeholder-[#4A5568]" onKeyDown={e => e.key === 'Escape' && onClose()} />
          <kbd className="px-1.5 py-0.5 text-[10px] text-[#4A5568] border border-[#2A2F3A] rounded font-mono">ESC</kbd>
        </div>
        <div className="py-2 max-h-80 overflow-y-auto">
          {secs.map(sec => (
            <div key={sec}>
              <div className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-[#4A5568] uppercase">{sec}</div>
              {filtered.filter(c => c.section === sec).map((cmd, i) => (
                <button key={i} onClick={onClose} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1A1D24] text-left group">
                  <SvgIcon d={cmd.icon} size={14} className="text-[#4A5568] group-hover:text-[#06B6D4] shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#F1F5F9]">{cmd.label}</div>
                    <div className="text-[11px] text-[#4A5568] truncate">{cmd.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const TopBar = ({ onPalette, chatState, onChatToggle, onDsToggle }: { onPalette: () => void; chatState: ChatState; onChatToggle: () => void; onDsToggle: () => void }) => (
  <div className="h-10 flex items-center px-3 gap-3 border-b border-[#1E2129] bg-[#0A0B0D] shrink-0 z-10">
    <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1A1D24] transition-colors group">
      <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-500 to-blue-600 shrink-0" />
      <span className="text-xs text-[#8892A4] group-hover:text-[#F1F5F9] font-medium">acme-corp</span>
      <SvgIcon d={I.chevDown} size={10} className="text-[#4A5568]" />
    </button>
    <span className="text-[#1E2129]">/</span>
    <span className="text-xs text-[#F1F5F9] font-semibold tracking-tight">SDLC Command Center</span>
    <div className="flex-1" />
    <button onClick={onPalette} className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#13151A] border border-[#2A2F3A] hover:border-[#06B6D4]/40 hover:bg-[#1A1D24] transition-all group">
      <SvgIcon d={I.search} size={12} className="text-[#4A5568] group-hover:text-[#8892A4]" />
      <span className="text-[11px] text-[#4A5568] group-hover:text-[#8892A4]">Search & run…</span>
      <kbd className="ml-1 px-1 py-0.5 text-[9px] font-mono text-[#4A5568] border border-[#2A2F3A] rounded">⌘K</kbd>
    </button>
    <div className="flex items-center gap-1.5 px-2">
      <StatusDot status="running" />
      <span className="text-[11px] text-[#8892A4] font-mono">1 running</span>
    </div>
    <button onClick={onDsToggle} title="Design System (Shift+D)" className="px-2 py-1 rounded text-[10px] font-mono text-[#2A2F3A] hover:text-[#4A5568] hover:bg-[#1A1D24] transition-colors">DS</button>
    <button className="relative p-1.5 rounded hover:bg-[#1A1D24] transition-colors">
      <SvgIcon d={I.bell} size={15} className="text-[#4A5568]" />
      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
    </button>
    <button onClick={onChatToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-all ${chatState === 'expanded' ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40 text-[#06B6D4]' : 'bg-[#13151A] border-[#2A2F3A] text-[#4A5568] hover:border-[#4A5568] hover:text-[#8892A4]'}`}>
      <SvgIcon d={I.chat} size={12} />
      <span>Assistant</span>
    </button>
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer">J</div>
  </div>
)

// ─── Icon Rail ────────────────────────────────────────────────────────────────

const NAV: { key: NavSection; icon: string | string[]; label: string; badge?: number }[] = [
  { key: 'command',      icon: I.command,      label: 'Command Center' },
  { key: 'agents',       icon: I.agents,       label: 'Agents' },
  { key: 'workflows',    icon: I.workflows,    label: 'Workflows' },
  { key: 'sessions',     icon: I.sessions,     label: 'Sessions' },
  { key: 'approvals',    icon: I.approvals,    label: 'Approvals', badge: 2 },
  { key: 'artifacts',    icon: I.artifacts,    label: 'Artifacts' },
  { key: 'skills',       icon: I.skills,       label: 'Skills' },
  { key: 'mcp',          icon: I.mcp,          label: 'MCP Servers' },
  { key: 'environments', icon: I.environments, label: 'Environments' },
  { key: 'traces',       icon: I.traces,       label: 'Traces' },
]

const IconRail = ({ active, onSelect }: { active: NavSection; onSelect: (n: NavSection) => void }) => (
  <div className="w-14 flex flex-col items-center py-2 gap-0.5 border-r border-[#1E2129] bg-[#0A0B0D] shrink-0">
    {NAV.map(({ key, icon, label, badge }) => {
      const isActive = active === key
      return (
        <button key={key} onClick={() => onSelect(key)} title={label}
          className={`group relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-[#0891B2]/20 text-[#06B6D4]' : 'text-[#3A4255] hover:text-[#6B7894] hover:bg-[#1A1D24]'}`}>
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#06B6D4] rounded-r" />}
          <SvgIcon d={icon} size={16} />
          {badge && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">{badge}</span>}
        </button>
      )
    })}
    <div className="flex-1" />
    <button onClick={() => onSelect('settings')} title="Settings"
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all text-[#3A4255] hover:text-[#6B7894] hover:bg-[#1A1D24]`}>
      <SvgIcon d={I.settings} size={16} />
    </button>
  </div>
)

// ─── Entity Column ─────────────────────────────────────────────────────────────

const ENTITY_LABELS: Partial<Record<NavSection, string>> = {
  agents: 'Agent', workflows: 'Workflow', sessions: 'Session', approvals: 'Approval',
  artifacts: 'Artifact', skills: 'Skill', mcp: 'MCP Server', environments: 'Environment', traces: 'Trace',
}

const EntityColumn = ({
  nav, activeId, onSelect, onStartCreate,
}: {
  nav: NavSection; activeId: string; onSelect: (id: string) => void
  onStartCreate: (type: NavSection, mode: CreationMode) => void
}) => {
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const titles: Partial<Record<NavSection, string>> = {
    agents: 'Agents', workflows: 'Workflows', sessions: 'Sessions', approvals: 'Approvals',
    artifacts: 'Artifacts', skills: 'Skills', mcp: 'MCP Servers', environments: 'Environments', traces: 'Traces', settings: 'Settings',
  }
  if (nav === 'command') return null
  const row = (id: string) => `w-full text-left px-3 py-2.5 hover:bg-[#13151A] transition-colors border-b border-[#1E2129]/40 ${activeId === id ? 'bg-[#101318] border-l-2 border-l-[#06B6D4] pl-[10px]' : ''}`
  const entityLabel = ENTITY_LABELS[nav] || nav

  return (
    <div className="w-[260px] flex flex-col border-r border-[#1E2129] bg-[#0D0F13] shrink-0 overflow-hidden relative">
      <div className="h-10 flex items-center justify-between px-3 border-b border-[#1E2129] shrink-0">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">{titles[nav]}</span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-[#1A1D24] text-[#4A5568] hover:text-[#8892A4] transition-colors">
            <SvgIcon d={I.filter} size={13} />
          </button>
          <button
            onClick={() => setMenuOpen(m => !m)}
            className={`p-1 rounded transition-colors ${menuOpen ? 'bg-[#06B6D4]/10 text-[#06B6D4]' : 'hover:bg-[#1A1D24] text-[#4A5568] hover:text-[#06B6D4]'}`}
          >
            <SvgIcon d={I.plus} size={14} />
          </button>
        </div>
      </div>

      {/* Creation mode menu */}
      {menuOpen && (
        <CreationModeMenu
          entityLabel={entityLabel}
          onSelect={mode => { onStartCreate(nav, mode); setMenuOpen(false) }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      <div className="px-3 py-2 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-2 bg-[#0A0B0D] rounded-lg border border-[#1E2129] px-2 py-1.5">
          <SvgIcon d={I.search} size={12} className="text-[#3A4255] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter…" className="flex-1 bg-transparent text-[11px] text-[#F1F5F9] outline-none placeholder-[#3A4255]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {nav === 'sessions' && SESSIONS.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase())).map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)} className={row(s.id)}>
            <div className="flex items-center gap-2 mb-0.5"><StatusDot status={s.status} /><span className="text-[10px] font-mono text-[#3A4255]">{s.id}</span><span className="ml-auto text-[10px] text-[#3A4255]">{s.ts}</span></div>
            <div className="text-[12px] text-[#C4CDD8] leading-tight truncate">{s.title}</div>
            <div className="text-[10px] text-[#3A4255] mt-0.5">{s.agent} · {s.duration}</div>
          </button>
        ))}
        {nav === 'agents' && AGENTS.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase())).map(a => (
          <button key={a.id} onClick={() => onSelect(a.id)} className={row(a.id)}>
            <div className="flex items-center gap-2 mb-1"><StatusDot status={a.status} /><span className="text-[12px] font-medium text-[#F1F5F9] truncate">{a.name}</span>{!a.published && <Badge label="DRAFT" variant="amber" />}</div>
            <div className="text-[10px] text-[#3A4255] font-mono">{a.model}</div>
            <div className="text-[10px] text-[#3A4255] mt-0.5">{a.mcp} MCP · {a.skills} skills · {a.lastRun}</div>
          </button>
        ))}
        {nav === 'workflows' && WORKFLOWS.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase())).map(w => (
          <button key={w.id} onClick={() => onSelect(w.id)} className={row(w.id)}>
            <div className="flex items-center gap-2 mb-1"><StatusDot status={w.status === 'running' ? 'running' : 'idle'} /><span className="text-[12px] font-medium text-[#C4CDD8] truncate">{w.name}</span></div>
            <div className="text-[10px] text-[#3A4255]">{w.agents} agents · {w.runs} runs · {w.lastRun}</div>
            {w.approval === 'required' && <div className="mt-0.5"><Badge label="APPROVAL" variant="amber" /></div>}
          </button>
        ))}
        {nav === 'approvals' && APPROVALS.map(a => (
          <button key={a.id} onClick={() => onSelect(a.id)} className={row(a.id)}>
            <div className="flex items-center gap-2 mb-1"><Badge label={a.risk.toUpperCase()} variant={a.risk === 'high' ? 'red' : 'amber'} /><span className="text-[10px] font-mono text-[#3A4255]">{a.id}</span></div>
            <div className="text-[11px] text-[#C4CDD8] font-mono truncate leading-tight">{a.action}</div>
            <div className="text-[10px] text-[#3A4255] mt-0.5">{a.agent} · {a.ts}</div>
          </button>
        ))}
        {nav === 'mcp' && MCP_SERVERS.filter(m => !search || m.name.includes(search)).map(m => (
          <button key={m.id} onClick={() => onSelect(m.id)} className={row(m.id)}>
            <div className="flex items-center gap-2 mb-1"><StatusDot status={m.status} /><span className="text-[12px] font-mono text-[#C4CDD8]">{m.name}</span></div>
            <div className="text-[10px] text-[#3A4255] truncate">{m.desc}</div>
            <div className="text-[10px] text-[#3A4255] font-mono mt-0.5">{m.tools} tools · v{m.version}</div>
          </button>
        ))}
        {nav === 'skills' && SKILLS.filter(s => !search || s.name.includes(search)).map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)} className={row(s.id)}>
            <div className="flex items-center gap-2 mb-1"><span className="text-[12px] font-mono text-[#C4CDD8]">{s.name}</span><Badge label={s.status} variant={s.status === 'stable' ? 'emerald' : 'amber'} /></div>
            <div className="text-[10px] text-[#3A4255] truncate">{s.desc}</div>
            <div className="text-[10px] text-[#3A4255] mt-0.5">{s.version} · {s.agents} agents</div>
          </button>
        ))}
        {nav === 'environments' && ENVIRONMENTS.map(e => (
          <button key={e.id} onClick={() => onSelect(e.id)} className={row(e.id)}>
            <div className="flex items-center gap-2 mb-1"><StatusDot status={e.status} /><span className="text-[12px] font-mono text-[#C4CDD8]">{e.name}</span></div>
            <div className="text-[10px] text-[#3A4255]">{e.type} · {e.agents} agents</div>
            <div className="mt-0.5"><Badge label={`${e.risk.toUpperCase()} RISK`} variant={e.risk === 'high' ? 'red' : e.risk === 'medium' ? 'amber' : 'slate'} /></div>
          </button>
        ))}
        {nav === 'traces' && TRACES.map(t => (
          <button key={t.id} onClick={() => onSelect(t.id)} className={row(t.id)}>
            <div className="flex items-center gap-2 mb-1"><StatusDot status={t.status} /><span className="text-[10px] font-mono text-[#3A4255]">{t.id}</span></div>
            <div className="text-[12px] text-[#C4CDD8]">{t.agent}</div>
            <div className="text-[10px] text-[#3A4255] mt-0.5">{t.events} events · {t.duration} · {t.ts}</div>
          </button>
        ))}
        {(nav === 'artifacts' || nav === 'settings') && (
          <div className="flex flex-col items-center justify-center h-32 text-[#3A4255]"><span className="text-[11px]">Nothing here yet</span></div>
        )}
      </div>
    </div>
  )
}

// ─── Metric tiles ─────────────────────────────────────────────────────────────

interface MetricTile { label: string; value: string | number; icon: string | string[]; nav: NavSection; accent?: string }
const METRIC_TILES: MetricTile[] = [
  { label: 'Active Sessions',   value: 1,   icon: I.sessions,     nav: 'sessions',     accent: 'cyan'  },
  { label: 'Pending Approvals', value: 2,   icon: I.approvals,    nav: 'approvals',    accent: 'amber' },
  { label: 'Failed Runs',       value: 1,   icon: I.alertTriangle,nav: 'sessions',     accent: 'red'   },
  { label: 'Agents',            value: 6,   icon: I.agents,       nav: 'agents'                       },
  { label: 'Workflows',         value: 4,   icon: I.workflows,    nav: 'workflows'                    },
  { label: 'Skills',            value: 5,   icon: I.skills,       nav: 'skills'                       },
  { label: 'MCP Servers',       value: 5,   icon: I.mcp,          nav: 'mcp'                          },
  { label: 'Environments',      value: 4,   icon: I.environments, nav: 'environments'                 },
  { label: 'Artifacts',         value: 23,  icon: I.artifacts,    nav: 'artifacts'                    },
  { label: 'Traces',            value: 142, icon: I.traces,       nav: 'traces'                       },
]

const MetricTiles = ({ onNavigate }: { onNavigate: (nav: NavSection) => void }) => {
  const accentMap: Record<string, { text: string; glow: string; border: string; val: string }> = {
    cyan:  { text: 'text-cyan-400',  glow: 'shadow-[0_0_12px_rgba(6,182,212,0.2)]',  border: 'border-cyan-800/40',  val: 'text-cyan-300'  },
    amber: { text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]', border: 'border-amber-800/40', val: 'text-amber-300' },
    red:   { text: 'text-red-400',   glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]',  border: 'border-red-800/40',   val: 'text-red-300'   },
  }
  return (
    <div className="flex gap-2 px-4 py-2.5 border-b border-[#1E2129] shrink-0 overflow-x-auto">
      {METRIC_TILES.map(tile => {
        const a = tile.accent ? accentMap[tile.accent] : null
        return (
          <button key={tile.label} onClick={() => onNavigate(tile.nav)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-[#13151A] hover:bg-[#1A1D24] transition-all group shrink-0 ${a ? `${a.border} ${a.glow}` : 'border-[#1E2129] hover:border-[#2A2F3A]'}`}>
            <SvgIcon d={tile.icon} size={13} className={a ? a.text : 'text-[#3A4255] group-hover:text-[#6B7894] transition-colors'} />
            <div className="text-left">
              <div className={`text-[15px] font-bold font-mono leading-none ${a ? a.val : 'text-[#F1F5F9]'}`}>{tile.value}</div>
              <div className="text-[9px] text-[#3A4255] mt-0.5 whitespace-nowrap group-hover:text-[#4A5568] transition-colors">{tile.label}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Canvas components ────────────────────────────────────────────────────────

const SubagentNode = ({ sub }: { sub: Subagent }) => {
  const s = sub.status
  const cls = s === 'running' ? 'border-[#0e4a5a] bg-[#0a1c21]' : s === 'waiting' ? 'border-amber-900/50 bg-amber-950/20' : 'border-[#1A2230] bg-[#0D1118]'
  const dot = s === 'running' ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]' : s === 'waiting' ? 'bg-amber-400' : 'bg-slate-600'
  const tc  = s === 'running' ? 'text-emerald-300' : s === 'waiting' ? 'text-amber-300' : 'text-slate-500'
  return (
    <div className={`relative rounded-lg border px-3 py-2.5 w-44 ${cls}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <span className="text-[11px] font-mono font-medium text-[#C4CDD8] truncate">{sub.name}</span>
      </div>
      <div className="text-[10px] text-[#4A5568] leading-tight truncate">{sub.action}</div>
      <div className="mt-1.5 flex items-center gap-1">
        <SvgIcon d={I.terminal} size={9} className="text-[#2A2F3A] shrink-0" />
        <span className={`text-[9px] font-mono ${tc}`}>{sub.tool}</span>
      </div>
    </div>
  )
}

const ApprovalBadge = ({ approval, onNavigate }: { approval: Approval; onNavigate: (nav: NavSection, id?: string) => void }) => (
  <div className="relative flex flex-col items-center">
    <div className="relative rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-2.5 w-64 cursor-pointer hover:border-amber-600/60 transition-all group"
      style={{ boxShadow: '0 0 16px rgba(245, 158, 11, 0.12)' }}
      onClick={() => onNavigate('approvals', approval.id)}>
      <Brackets color="#d97706" size={6} />
      <div className="flex items-center gap-2 mb-1.5">
        <SvgIcon d={I.lock} size={11} className="text-amber-400 shrink-0" />
        <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-400">Approval Required</span>
        <Badge label={approval.risk.toUpperCase()} variant={approval.risk === 'high' ? 'red' : 'amber'} />
      </div>
      <div className="text-[10px] font-mono text-amber-200/70 leading-relaxed truncate">{approval.action}</div>
      <div className="flex gap-2 mt-2">
        <button onClick={e => { e.stopPropagation(); onNavigate('approvals', approval.id) }} className="flex-1 py-1 rounded text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-950/60 transition-colors">Approve</button>
        <button onClick={e => e.stopPropagation()} className="flex-1 py-1 rounded text-[10px] font-medium text-red-400 bg-red-950/40 border border-red-800/40 hover:bg-red-950/60 transition-colors">Reject</button>
      </div>
    </div>
    <div className="w-px h-4 border-l border-dashed border-amber-700/40" />
  </div>
)

const AgentNode = ({ agent, onNavigate }: { agent: ActiveAgent; onNavigate: (nav: NavSection, id?: string) => void }) => {
  const isWaiting = agent.status === 'waiting'
  const border = isWaiting ? '#b45309' : '#0891B2'
  const glow   = isWaiting ? 'rgba(180,83,9,0.22)' : 'rgba(6,182,212,0.22)'
  const ring   = isWaiting ? 'border-amber-700/30' : 'border-cyan-700/20'
  const label  = isWaiting ? 'text-amber-400' : 'text-cyan-400'
  const pulse  = isWaiting ? 'animate-amber-ring' : 'animate-node-ring'
  return (
    <div className="relative rounded-xl border bg-[#13151A] px-5 py-4 w-64 cursor-pointer hover:bg-[#1A1D24] transition-all group"
      style={{ borderColor: border, boxShadow: `0 0 20px ${glow}, 0 0 0 1px ${border}20` }}
      onClick={() => onNavigate('sessions', agent.session)}>
      <Brackets color={border} size={8} />
      <div className={`absolute -inset-2 rounded-2xl border ${ring} ${pulse} pointer-events-none`} />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} />
          <span className={`text-[10px] font-mono font-semibold tracking-widest uppercase ${label}`}>{isWaiting ? 'Blocked' : 'Running'}</span>
        </div>
        <span className="text-[10px] font-mono text-[#4A5568]">{agent.elapsed}</span>
      </div>
      <div className="text-[15px] font-semibold text-[#F1F5F9] mb-0.5 tracking-tight">{agent.name}</div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-[#4A5568] bg-[#0D0F13] px-1.5 py-0.5 rounded border border-[#1E2129]">{agent.model}</span>
        <span className="text-[#1E2129]">·</span>
        <span className="text-[10px] font-mono text-[#4A5568]">{agent.session}</span>
      </div>
      <div className="flex items-start gap-1.5 mb-3">
        <SvgIcon d={I.activity} size={11} className={`${label} opacity-80 shrink-0 mt-0.5`} />
        <span className="text-[11px] text-[#8892A4] italic leading-tight">{agent.activity}</span>
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-[#1E2129]">
        <div className="flex items-center gap-1.5">
          <SvgIcon d={I.cpu} size={11} className="text-[#3A4255]" />
          <span className="text-[10px] font-mono text-[#4A5568]">{agent.tools} tools</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#3A4255]">{agent.subagents.length} subagents</span>
          <SvgIcon d={I.chevRight} size={11} className="text-[#2A2F3A] group-hover:text-[#4A5568] transition-colors" />
        </div>
      </div>
    </div>
  )
}

const AgentGroup = ({ agent, onNavigate }: { agent: ActiveAgent; onNavigate: (nav: NavSection, id?: string) => void }) => (
  <div className="flex flex-col items-center">
    {agent.approval && <ApprovalBadge approval={agent.approval} onNavigate={onNavigate} />}
    <AgentNode agent={agent} onNavigate={onNavigate} />
    {agent.subagents.length > 0 && (
      <div className="flex flex-col items-center">
        <div className="w-px h-5 border-l border-dashed border-[#1E2129]" />
        <div className="relative flex items-center justify-center">
          {agent.subagents.length > 1 && (
            <div className="absolute top-0 h-px bg-[#1E2129]" style={{ width: `${(agent.subagents.length - 1) * 188}px` }} />
          )}
          <div className="flex gap-3">
            {agent.subagents.map((sub, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-px h-3 border-l border-dashed border-[#1E2129]" />
                <SubagentNode sub={sub} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
)

const CommandCenterCanvas = ({ onNavigate }: { onNavigate: (nav: NavSection, id?: string) => void }) => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="h-10 flex items-center px-5 border-b border-[#1E2129] shrink-0 gap-3">
      <SvgIcon d={I.command} size={14} className="text-[#06B6D4]" />
      <span className="text-sm font-semibold text-[#F1F5F9]">Command Center</span>
      <span className="text-[10px] font-mono text-[#3A4255] border border-[#1E2129] bg-[#13151A] px-2 py-0.5 rounded">LIVE</span>
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" /><span className="text-[11px] font-mono text-[#4A5568]">fleet healthy</span></div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[11px] font-mono text-amber-400">2 approvals pending</span></div>
      </div>
    </div>
    <MetricTiles onNavigate={nav => onNavigate(nav)} />
    <div className="flex-1 relative overflow-auto canvas-dot-grid">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(10,11,13,0.6) 100%)' }} />
      <div className="absolute left-0 right-0 h-24 pointer-events-none animate-scanline" style={{ background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.03), transparent)' }} />
      <div className="absolute top-3 left-4 pointer-events-none"><span className="text-[9px] font-mono tracking-widest uppercase text-[#2A2F3A]">Active Fleet · {ACTIVE_FLEET.length} agents</span></div>
      <div className="absolute top-3 right-4 pointer-events-none"><span className="text-[9px] font-mono text-[#2A2F3A]">14:27:24 UTC</span></div>
      <div className="flex items-start justify-center gap-12 px-8 py-16 min-h-full">
        {ACTIVE_FLEET.map(agent => <AgentGroup key={agent.id} agent={agent} onNavigate={onNavigate} />)}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-2 border-t border-[#1E2129]/50 bg-[#0A0B0D]/80 backdrop-blur-sm pointer-events-none">
        <div className="flex items-center gap-4">
          {[['Total tool calls', '28'], ['Tokens used', '10.8k'], ['Subagents active', '6']].map(([l, v]) => (
            <div key={l} className="flex items-center gap-2"><span className="text-[9px] uppercase tracking-widest text-[#2A2F3A]">{l}</span><span className="text-[10px] font-mono text-[#4A5568]">{v}</span></div>
          ))}
        </div>
        <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#2A2F3A] animate-pulse" /><span className="text-[9px] font-mono text-[#2A2F3A]">streaming</span></div>
      </div>
    </div>
  </div>
)

// ─── Other workspaces ─────────────────────────────────────────────────────────

const SessionWorkspace = ({ session }: { session: typeof SESSIONS[0] }) => {
  const [tab, setTab] = useState<'trace' | 'output' | 'config'>('trace')
  const [expandedTc, setExpandedTc] = useState<string | null>('tc-001')
  const tcColor: Record<string, string> = { done: 'text-emerald-400', running: 'text-cyan-400', error: 'text-red-400', pending: 'text-amber-400' }
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-10 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-3 min-w-0"><StatusDot status={session.status} /><span className="text-sm font-medium text-[#F1F5F9] truncate">{session.title}</span><span className="font-mono text-[10px] text-[#3A4255] bg-[#13151A] px-2 py-0.5 rounded border border-[#1E2129] shrink-0">{session.id}</span></div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-[#3A4255]">{session.ts}</span>
          <span className="text-[#1E2129]">·</span><span className="text-[11px] text-[#3A4255]">{session.tools} tools</span>
          {session.status === 'running' && <button className="ml-1 flex items-center gap-1.5 px-2 py-1 rounded bg-[#13151A] border border-[#2A2F3A] text-[11px] text-[#8892A4] hover:border-red-500/40 hover:text-red-400 transition-all"><span className="w-2 h-2 bg-current rounded-sm" />Stop</button>}
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] text-[#06B6D4] hover:bg-[#06B6D4]/20 transition-all"><SvgIcon d={I.play} size={10} />Replay</button>
        </div>
      </div>
      <div className="flex items-center px-5 border-b border-[#1E2129] shrink-0">
        {(['trace', 'output', 'config'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[12px] font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#4A5568] hover:text-[#8892A4]'}`}>{t}</button>)}
      </div>
      {tab === 'trace' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-60 border-r border-[#1E2129] flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1E2129] shrink-0"><span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]">Tool Calls</span></div>
            <div className="flex-1 overflow-y-auto py-1">
              {TOOL_CALLS.map((tc, idx) => (
                <button key={tc.id} onClick={() => setExpandedTc(expandedTc === tc.id ? null : tc.id)} className={`w-full text-left px-3 py-2 hover:bg-[#13151A] transition-colors ${expandedTc === tc.id ? 'bg-[#13151A]' : ''}`}>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-[#2A2F3A] w-4 shrink-0">{String(idx + 1).padStart(2, '0')}</span><span className={`text-[11px] font-mono ${tcColor[tc.status]}`}>{tc.tool}</span>{tc.status === 'running' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}{tc.dur && <span className="ml-auto text-[9px] font-mono text-[#3A4255]">{tc.dur}</span>}</div>
                  <div className="mt-0.5 text-[9px] font-mono text-[#3A4255] truncate pl-6">{Object.values(tc.args)[0]}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {expandedTc && (() => { const tc = TOOL_CALLS.find(t => t.id === expandedTc); if (!tc) return null; return (
              <div className="border-b border-[#1E2129] p-4 bg-[#0D0F13] shrink-0">
                <div className="flex items-center gap-2 mb-2"><span className={`text-[12px] font-mono font-semibold ${tcColor[tc.status]}`}>{tc.tool}</span><Badge label={tc.status.toUpperCase()} variant={tc.status === 'done' ? 'emerald' : 'cyan'} />{tc.dur && <span className="ml-auto text-[10px] font-mono text-[#3A4255]">{tc.dur}</span>}</div>
                <div className="bg-[#0A0B0D] rounded-lg border border-[#1E2129] p-3 font-mono text-[11px] text-[#C4CDD8] mb-2">{Object.entries(tc.args).map(([k, v]) => <div key={k}><span className="text-[#3A4255]">{k}: </span><span className="text-[#06B6D4]">"{v}"</span></div>)}</div>
                {tc.result && <div className="text-[11px] text-[#8892A4]"><span className="text-[#3A4255]">→ </span>{tc.result}</div>}
              </div>
            )})()}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {LOG_LINES.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[#1E2129] font-mono text-[10px] shrink-0 mt-0.5">{line.ts}</span>
                  {line.type === 'user'   && <div className="flex-1 font-mono text-[12px]"><span className="text-[#3A4255] mr-2">▶</span><span className="text-[#F1F5F9]">{line.content}</span></div>}
                  {line.type === 'agent'  && <div className="flex-1 text-[12px] text-[#C4CDD8] leading-relaxed">{line.content}</div>}
                  {line.type === 'tool'   && <div className="flex-1 flex items-center gap-2 font-mono text-[11px]"><span className="text-[#3A4255]">⤷</span><span className="text-[#06B6D4]">{line.tool}</span><span className="text-[#3A4255] truncate">{line.detail}</span></div>}
                  {line.type === 'stream' && <div className="flex-1 font-mono text-[11px] text-[#3A4255]">{line.content}</div>}
                </div>
              ))}
              {session.status === 'running' && <div className="flex gap-3"><span className="text-[#1E2129] font-mono text-[10px]">14:27:25</span><span className="animate-pulse text-[#06B6D4]">█</span></div>}
            </div>
          </div>
        </div>
      )}
      {tab !== 'trace' && <div className="flex-1 flex items-center justify-center text-[11px] text-[#3A4255]">{tab} view</div>}
    </div>
  )
}

const AgentWorkspace = ({ agent }: { agent: typeof AGENTS[0] }) => {
  const [tab, setTab] = useState<'overview' | 'configuration' | 'capabilities' | 'sessions' | 'versions'>('overview')
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-10 flex items-center justify-between px-5 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-3"><StatusDot status={agent.status} /><span className="text-sm font-semibold text-[#F1F5F9]">{agent.name}</span><Badge label={agent.published ? 'PUBLISHED' : 'DRAFT'} variant={agent.published ? 'emerald' : 'amber'} /></div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-[11px] bg-[#13151A] border border-[#2A2F3A] text-[#8892A4] hover:border-[#4A5568] transition-all">Edit</button>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4] hover:bg-[#06B6D4]/20 transition-all"><SvgIcon d={I.play} size={10} />Run</button>
        </div>
      </div>
      <div className="flex items-center px-5 border-b border-[#1E2129] shrink-0">
        {(['overview', 'configuration', 'capabilities', 'sessions', 'versions'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[12px] font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#4A5568] hover:text-[#8892A4]'}`}>{t}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && (
          <div className="grid grid-cols-3 gap-3">
            {[['Total Runs', agent.runs.toLocaleString()], ['Last Run', agent.lastRun], ['MCP Servers', String(agent.mcp)]].map(([l, v]) => (
              <div key={l} className="bg-[#13151A] rounded-xl border border-[#1E2129] p-4"><div className="text-[10px] text-[#3A4255] uppercase tracking-widest mb-1">{l}</div><div className="text-xl font-bold font-mono text-[#F1F5F9]">{v}</div></div>
            ))}
          </div>
        )}
        {tab !== 'overview' && <div className="text-[12px] text-[#3A4255]">{tab} content.</div>}
      </div>
    </div>
  )
}

const ApprovalWorkspace = ({ approval }: { approval: typeof APPROVALS[0] }) => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="h-10 flex items-center px-5 border-b border-[#1E2129] shrink-0 gap-3"><span className="text-sm font-medium text-[#F1F5F9]">Approval Request</span><span className="font-mono text-[10px] text-[#3A4255]">{approval.id}</span></div>
    <div className="flex-1 overflow-y-auto p-6">
      <div className={`rounded-xl border p-5 mb-6 ${approval.risk === 'high' ? 'bg-red-950/10 border-red-800/30' : 'bg-amber-950/10 border-amber-800/30'}`}>
        <div className="flex items-center gap-2 mb-3"><Badge label={`${approval.risk.toUpperCase()} RISK`} variant={approval.risk === 'high' ? 'red' : 'amber'} /><span className="text-[11px] text-[#3A4255]">Agent requires approval to proceed</span></div>
        <div className="font-mono text-[13px] text-[#F1F5F9] leading-relaxed">{approval.action}</div>
        <div className="text-[11px] text-[#3A4255] mt-2">{approval.agent} · {approval.ts}</div>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[13px] font-medium hover:bg-emerald-500/20 transition-all"><SvgIcon d={I.check} size={14} />Approve</button>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-medium hover:bg-red-500/20 transition-all"><SvgIcon d={I.x} size={14} />Reject</button>
      </div>
    </div>
  </div>
)

const McpWorkspace = ({ server }: { server: typeof MCP_SERVERS[0] }) => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="h-10 flex items-center gap-3 px-5 border-b border-[#1E2129] shrink-0"><StatusDot status={server.status} /><span className="text-sm font-mono font-medium text-[#F1F5F9]">{server.name}</span><Badge label={`v${server.version}`} /><Badge label={server.status.toUpperCase()} variant={server.status === 'connected' ? 'emerald' : 'amber'} /></div>
    <div className="flex-1 overflow-y-auto p-6">
      <p className="text-[13px] text-[#8892A4] mb-6">{server.desc}</p>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: Math.min(server.tools, 8) }, (_, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#13151A] border border-[#1E2129]">
            <SvgIcon d={I.terminal} size={12} className="text-[#3A4255]" />
            <span className="text-[11px] font-mono text-[#8892A4]">{server.name.replace('-mcp', '')}_{['list','get','create','update','delete','search','run','check'][i % 8]}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const EmptyWorkspace = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-[#2A2F3A] select-none">
    <span className="text-[12px]">Select an item</span>
  </div>
)

// ─── Platform Chat Panel ──────────────────────────────────────────────────────

const ChatPanel = ({ state, onClose, onCollapse }: { state: ChatState; onClose: () => void; onCollapse: () => void }) => {
  const [msgs, setMsgs] = useState(INIT_CHAT)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const send = () => {
    if (!input.trim()) return
    setMsgs(m => [...m, { role: 'user', content: input }])
    setInput('')
    setTyping(true)
    setTimeout(() => { setMsgs(m => [...m, { role: 'assistant', content: 'Querying platform state…', actions: ['Open session', 'View trace'] }]); setTyping(false) }, 1100)
  }
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  if (state === 'collapsed') {
    return (
      <div className="w-10 flex flex-col items-center border-l border-[#1E2129] bg-[#0D0F13] py-3 gap-3 shrink-0">
        <button onClick={onCollapse} className="p-2 rounded-lg hover:bg-[#1A1D24] text-[#4A5568] hover:text-[#06B6D4] transition-colors"><SvgIcon d={I.chat} size={15} /></button>
        <div className="w-px h-4 bg-[#1E2129]" />
        {[I.zap, I.eye, I.link].map((icon, i) => <button key={i} className="p-2 rounded-lg hover:bg-[#1A1D24] text-[#2A2F3A] hover:text-[#4A5568] transition-colors"><SvgIcon d={icon} size={13} /></button>)}
      </div>
    )
  }

  return (
    <div className="w-80 flex flex-col border-l border-[#1E2129] bg-[#0D0F13] shrink-0 overflow-hidden">
      <div className="h-10 flex items-center justify-between px-3 border-b border-[#1E2129] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center"><SvgIcon d={I.zap} size={9} className="text-white" /></div>
          <span className="text-[11px] font-semibold text-[#F1F5F9]">Platform Assistant</span>
          <StatusDot status="running" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onCollapse} className="p-1 rounded hover:bg-[#1A1D24] text-[#3A4255] hover:text-[#8892A4] transition-colors"><SvgIcon d={I.chevRight} size={13} /></button>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#1A1D24] text-[#3A4255] hover:text-[#8892A4] transition-colors"><SvgIcon d={I.x} size={13} /></button>
        </div>
      </div>
      <div className="px-3 py-1.5 border-b border-[#1E2129] bg-[#0A0B0D] shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-[#3A4255]"><SvgIcon d={I.eye} size={11} className="shrink-0" /><span>Context: </span><span className="font-mono text-[#4A5568]">Command Center</span></div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {msgs.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] px-3 py-2 rounded-xl bg-[#1A1D24] border border-[#2A2F3A] text-[12px] text-[#F1F5F9] leading-relaxed">{msg.content}</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shrink-0"><SvgIcon d={I.zap} size={9} className="text-white" /></div>
                  <span className="text-[10px] text-[#3A4255]">Assistant</span>
                </div>
                <div className="text-[12px] text-[#C4CDD8] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                {msg.actions && <div className="flex flex-wrap gap-1.5 mt-2">{msg.actions.map(a => <button key={a} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#13151A] border border-[#2A2F3A] text-[10px] font-medium text-[#8892A4] hover:border-[#06B6D4]/40 hover:text-[#06B6D4] transition-all"><SvgIcon d={I.externalLink} size={10} />{a}</button>)}</div>}
              </div>
            )}
          </div>
        ))}
        {typing && <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-600 to-blue-700" /><div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-[#4A5568] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-[#1E2129] shrink-0">
        <div className="flex flex-wrap gap-1">
          {["What's running?", 'Pending approvals?', 'Summarize fleet'].map(q => (
            <button key={q} onClick={() => setInput(q)} className="px-2 py-1 rounded bg-[#13151A] border border-[#1E2129] text-[10px] text-[#4A5568] hover:text-[#8892A4] hover:border-[#2A2F3A] transition-all">{q}</button>
          ))}
        </div>
      </div>
      <div className="px-3 py-3 border-t border-[#1E2129] shrink-0">
        <div className="flex items-center gap-2 bg-[#0A0B0D] rounded-xl border border-[#1E2129] focus-within:border-[#06B6D4]/40 px-3 py-2 transition-colors">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask the platform…" className="flex-1 bg-transparent text-[12px] text-[#F1F5F9] outline-none placeholder-[#3A4255]" />
          <button onClick={send} className={`transition-colors ${input.trim() ? 'text-[#06B6D4] hover:text-cyan-300' : 'text-[#2A2F3A]'}`}><SvgIcon d={I.send} size={14} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [nav, setNav] = useState<NavSection>('command')
  const [activeId, setActiveId] = useState<string>('')
  const [chatState, setChatState] = useState<ChatState>('expanded')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [creating, setCreating] = useState<CreatingEntity | null>(null)
  const [showDs, setShowDs] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      if (e.shiftKey && e.key === 'D' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setShowDs(o => !o) }
      if (e.key === 'Escape') setShowDs(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (showDs) return (
    <div className="relative h-screen">
      <DesignSystem />
      <button onClick={() => setShowDs(false)}
        className="fixed top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13151A] border border-[#2A2F3A] text-[11px] text-[#8892A4] hover:border-[#06B6D4]/40 hover:text-[#06B6D4] transition-all shadow-xl">
        <SvgIcon d={I.x} size={11} />Back to app <kbd className="font-mono text-[9px] opacity-60">ESC</kbd>
      </button>
    </div>
  )

  const handleNavSelect = (section: NavSection, id?: string) => {
    setCreating(null)
    setNav(section)
    if (id) { setActiveId(id); return }
    const defaults: Partial<Record<NavSection, string>> = {
      sessions: SESSIONS[0].id, agents: AGENTS[0].id, workflows: WORKFLOWS[0].id,
      approvals: APPROVALS[0].id, mcp: MCP_SERVERS[0].id, skills: SKILLS[0].id,
      environments: ENVIRONMENTS[0].id, traces: TRACES[0].id,
    }
    setActiveId(defaults[section] || '')
  }

  const handleStartCreate = (type: NavSection, mode: CreationMode) => {
    setCreating({ type, mode })
  }

  const handleCreationComplete = (name: string) => {
    // In a real app, save entity and select it
    setCreating(null)
    // Briefly show a success indicator (just clear creating)
  }

  const toggleChat = () => setChatState(s => s === 'expanded' ? 'collapsed' : 'expanded')

  const renderWorkspace = () => {
    if (creating) {
      return <CreationWorkspace creating={creating} onCancel={() => setCreating(null)} onComplete={handleCreationComplete} />
    }
    if (nav === 'command') return <CommandCenterCanvas onNavigate={handleNavSelect} />
    if (!activeId) return <EmptyWorkspace />
    if (nav === 'sessions')  { const s = SESSIONS.find(s => s.id === activeId);    return s ? <SessionWorkspace session={s} />  : <EmptyWorkspace /> }
    if (nav === 'agents')    { const a = AGENTS.find(a => a.id === activeId);       return a ? <AgentWorkspace agent={a} />      : <EmptyWorkspace /> }
    if (nav === 'approvals') { const a = APPROVALS.find(a => a.id === activeId);    return a ? <ApprovalWorkspace approval={a} /> : <EmptyWorkspace /> }
    if (nav === 'mcp')       { const m = MCP_SERVERS.find(m => m.id === activeId);  return m ? <McpWorkspace server={m} />       : <EmptyWorkspace /> }
    return <EmptyWorkspace />
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0B0D] text-[#F1F5F9] overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <TopBar onPalette={() => setPaletteOpen(true)} chatState={chatState} onChatToggle={toggleChat} onDsToggle={() => setShowDs(true)} />
      <div className="flex-1 flex overflow-hidden">
        <IconRail active={nav} onSelect={handleNavSelect} />
        <EntityColumn nav={nav} activeId={activeId} onSelect={setActiveId} onStartCreate={handleStartCreate} />
        {renderWorkspace()}
        {chatState !== 'hidden' && <ChatPanel state={chatState} onClose={() => setChatState('hidden')} onCollapse={toggleChat} />}
      </div>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
