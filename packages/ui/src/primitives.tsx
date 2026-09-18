import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { I, SvgIcon } from "./icons.js";
import { cn } from "./lib/cn.js";

export const inputBase =
  "w-full bg-[#0A0B0D] border border-[#1E2129] rounded-lg px-3 text-[13px] text-[#F1F5F9] placeholder-[#3A4255] outline-none transition-colors focus:border-[#06B6D4]/60 hover:border-[#2A2F3A]";

export type BadgeVariant = "cyan" | "emerald" | "red" | "amber" | "slate";

const badgeVariants: Record<BadgeVariant, string> = {
  cyan: "bg-cyan-950/60 text-cyan-300 border-cyan-800/60",
  emerald: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
  red: "bg-red-950/60 text-red-300 border-red-800/60",
  amber: "bg-amber-950/60 text-amber-300 border-amber-800/60",
  slate: "bg-[#1E2129] text-[#8892A4] border-[#2A2F3A]",
};

const statusDotMap: Record<string, string> = {
  running: "bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.9)]",
  active: "bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.9)]",
  completed: "bg-emerald-400",
  done: "bg-emerald-400",
  connected: "bg-emerald-400",
  healthy: "bg-emerald-400",
  stable: "bg-emerald-400",
  published: "bg-emerald-400",
  idle: "bg-slate-600",
  paused: "bg-slate-600",
  failed: "bg-red-400",
  error: "bg-red-400",
  degraded: "bg-amber-400",
  waiting: "bg-amber-400",
  blocked: "bg-amber-400",
  beta: "bg-amber-400",
  draft: "bg-amber-400",
};

export function StatusDot({ status }: { status: string }) {
  const pulse = status === "running" || status === "active";
  const color = statusDotMap[status] ?? "bg-slate-600";
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {pulse ? <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", color)} /> : null}
      <span className={cn("relative h-2 w-2 rounded-full", color)} />
    </span>
  );
}

export function Badge({ label, variant = "slate" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border font-mono tracking-wide leading-none",
        badgeVariants[variant] ?? badgeVariants.slate,
      )}
    >
      {label}
    </span>
  );
}

export function Brackets({ color = "#06B6D4", size = 7 }: { color?: string; size?: number }) {
  return (
    <>
      <span className="absolute top-0 left-0 border-t border-l pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
      <span className="absolute top-0 right-0 border-t border-r pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
      <span className="absolute bottom-0 left-0 border-b border-l pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
      <span className="absolute bottom-0 right-0 border-b border-r pointer-events-none" style={{ width: size, height: size, borderColor: color }} />
    </>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]", className)}>
      {children}
    </span>
  );
}

export function IdChip({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] text-[#3A4255] bg-[#13151A] px-2 py-0.5 rounded border border-[#1E2129]">
      {children}
    </span>
  );
}

export function shortId(id: string): string {
  return id.replaceAll("-", "").slice(0, 8);
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4] hover:bg-[#06B6D4]/20",
  secondary: "bg-[#13151A] border border-[#2A2F3A] text-[#8892A4] hover:border-[#4A5568]",
  danger: "bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-950/60",
  success: "bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60",
  ghost: "border-transparent text-[#4A5568] hover:text-[#8892A4]",
};

export function Button({
  variant = "secondary",
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium px-3 py-1.5 transition-colors cursor-pointer",
        buttonVariants[variant],
        disabled && "opacity-30 cursor-not-allowed",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-[11px] font-medium uppercase tracking-wider text-[#8892A4]">
          {label}
        </label>
        {required ? <span className="font-mono text-[10px] text-red-400" aria-hidden>*</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400">
          <SvgIcon d={I.alertCircle} size={11} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[10px] text-[#3A4255]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TInput({
  mono,
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean; invalid?: boolean }) {
  return (
    <input
      className={cn(inputBase, "py-2", mono && "font-mono text-[12px]", invalid && "border-red-500/60 focus:border-red-500/80", className)}
      {...props}
    />
  );
}

export function TTextarea({
  mono,
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean; invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        inputBase,
        "resize-none py-2 leading-relaxed",
        mono && "font-mono text-[12px]",
        invalid && "border-red-500/60 focus:border-red-500/80",
        className,
      )}
      {...props}
    />
  );
}

export function TSelect({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(inputBase, "py-2 appearance-none cursor-pointer", invalid && "border-red-500/60 focus:border-red-500/80", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function TToggle({
  checked,
  onCheckedChange,
  label,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full border transition-colors",
          checked ? "border-[#06B6D4]/60 bg-[#06B6D4]/20" : "border-[#2A2F3A] bg-[#13151A]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-[left,background-color]",
            checked ? "left-[18px] bg-[#06B6D4]" : "left-0.5 bg-[#4A5568]",
          )}
        />
      </button>
      <label htmlFor={id} className="text-[12px] text-[#C4CDD8]">
        {label}
      </label>
    </div>
  );
}

export function FormSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="overflow-hidden rounded-xl border border-[#1E2129]">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-[#13151A] px-4 py-3 hover:bg-[#1A1D24]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7894]">{title}</span>
        <SvgIcon d={I.chevUp} size={13} className="text-[#3A4255]" />
      </summary>
      <div className="space-y-4 bg-[#0D0F13] px-4 py-4">{children}</div>
    </details>
  );
}

export function EntityColumnHeader({
  title,
  createAction,
}: {
  title: string;
  createAction: ReactNode;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1E2129] px-3">
      <SectionLabel className="text-[11px]">{title}</SectionLabel>
      {createAction}
    </div>
  );
}

export function createActionClassName(): string {
  return "flex h-6 w-6 items-center justify-center rounded text-[#4A5568] transition-colors hover:text-[#06B6D4]";
}

export function entityRowClassName(selected?: boolean): string {
  return cn(
    "block border-b border-[#1E2129]/40 py-2.5 pr-3 no-underline transition-colors",
    selected ? "border-l-2 border-l-[#06B6D4] bg-[#101318] pl-[10px]" : "px-3 hover:bg-[#13151A]",
  );
}

export function EntityRowBody({
  name,
  selected,
  status,
  meta,
  extra,
  children,
}: {
  name: string;
  selected?: boolean;
  status: string;
  meta?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <StatusDot status={status} />
        <span className={cn("text-[12px] font-medium", selected ? "text-[#F1F5F9]" : "text-[#C4CDD8]")}>{name}</span>
        {extra}
      </div>
      {meta ? <div className="font-mono text-[10px] text-[#3A4255]">{meta}</div> : null}
      {children ? <div className="mt-0.5 text-[10px] text-[#3A4255]">{children}</div> : null}
    </>
  );
}

export function WorkspaceHeader({
  status,
  title,
  id,
  meta,
  actions,
}: {
  status?: string;
  title: string;
  id?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1E2129] bg-[#13151A] px-5">
      <div className="flex min-w-0 items-center gap-3">
        {status ? <StatusDot status={status} /> : null}
        <h1 className="truncate text-sm font-medium text-[#F1F5F9]">{title}</h1>
        {id ? <IdChip>{id}</IdChip> : null}
        {meta ? <span className="font-mono text-[11px] text-[#4A5568]">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyWorkspace({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex h-full flex-col px-6 py-8">
      <h1 className="mb-2 text-sm font-semibold text-[#F1F5F9]">{title}</h1>
      <p className="max-w-lg text-[13px] text-[#8892A4]">{body}</p>
    </section>
  );
}

export function LoadingState({ children }: { children: ReactNode }) {
  return (
    <section className="flex h-full items-center justify-center px-6">
      <p className="text-[13px] text-[#4A5568]">{children}</p>
    </section>
  );
}

export type ValidationSeverity = "blocking" | "warning" | "ok";

export function ValidationList({
  testId,
  severity,
  items,
}: {
  testId: string;
  severity: ValidationSeverity;
  items: { field: string; message: string }[];
}) {
  if (!items.length) {
    return null;
  }
  const surface =
    severity === "blocking"
      ? "bg-red-950/20 border-red-800/30 text-red-400"
      : severity === "warning"
        ? "bg-amber-950/20 border-amber-800/30 text-amber-300"
        : "bg-emerald-950/10 border-emerald-800/20 text-emerald-400";
  const icon = severity === "blocking" ? I.alertCircle : severity === "warning" ? I.alertTriangle : I.checkCircle;
  const wrapperColor =
    severity === "blocking" ? "text-red-400" : severity === "warning" ? "text-amber-300" : "text-emerald-400";
  return (
    <div data-testid={testId} data-severity={severity} className={cn("grid gap-1.5", wrapperColor)}>
      {items.map((issue) => (
        <p
          key={`${issue.field}:${issue.message}`}
          role={severity === "blocking" ? "alert" : undefined}
          className={cn("m-0 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px]", surface)}
        >
          <SvgIcon d={icon} size={12} className="mt-0.5 shrink-0" />
          <span>{issue.message}</span>
        </p>
      ))}
    </div>
  );
}

function highlightJson(value: unknown): string {
  const json = JSON.stringify(value ?? {}, null, 2)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return `<span class="text-[#6B7894]">${match}</span>`;
        }
        return `<span class="text-[#06B6D4]">${match}</span>`;
      }
      if (/true|false|null/.test(match)) {
        return `<span class="text-emerald-400">${match}</span>`;
      }
      return `<span class="text-amber-400">${match}</span>`;
    },
  );
}

export function JsonPreview({ testId, value }: { testId: string; value: unknown }) {
  const copyId = useId();
  const text = JSON.stringify(value ?? {}, null, 2);
  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2129] bg-[#0A0B0D]">
      <div className="flex items-center justify-between border-b border-[#1E2129] px-3 py-2">
        <SectionLabel>JSON Preview</SectionLabel>
        <button
          type="button"
          id={copyId}
          className="text-[10px] text-[#4A5568] transition-colors hover:text-[#8892A4]"
          onClick={() => {
            void navigator.clipboard?.writeText(text);
          }}
        >
          Copy
        </button>
      </div>
      <pre
        data-testid={testId}
        className="adlc-machine m-0 overflow-auto whitespace-pre-wrap p-3 text-[12px] text-[#C4CDD8]"
        dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
      />
    </div>
  );
}

export function ReviewPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="grid content-start gap-3 rounded-xl border border-[#1E2129] bg-[#0D0F13] p-3">
      {children}
    </aside>
  );
}
