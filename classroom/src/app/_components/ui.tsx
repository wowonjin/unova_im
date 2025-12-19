import Link from "next/link";
import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`rounded-2xl border border-white/10 bg-white/5 ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-white/60">{description}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-white/60">{description}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  type,
  formAction,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  href?: string;
  type?: "button" | "submit";
  formAction?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50";
  const sizes = size === "sm" ? "h-9 px-3" : "h-10 px-4";
  const variants =
    variant === "primary"
      ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
      : variant === "secondary"
        ? "border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
        : variant === "danger"
          ? "border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/15"
          : "border-transparent bg-transparent text-white/80 hover:bg-white/10";

  const cls = `${base} ${sizes} ${variants}`;

  if (href) return <Link className={cls} href={href}>{children}</Link>;
  return (
    <button className={cls} type={type ?? "button"} formAction={formAction}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "muted" }) {
  const cls =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-200"
      : tone === "muted"
        ? "bg-white/5 text-white/50"
        : "bg-white/10 text-white/80";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/80">{label}</label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs text-white/50">{hint}</p> : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10 ${className}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10 ${className}`}
    />
  );
}

export function Tabs({
  items,
  activeKey,
}: {
  items: { key: string; label: string; href: string }[];
  activeKey: string;
}) {
  return (
    <div className="mt-5 border-b border-white/10">
      <div className="flex items-center gap-6">
        {items.map((it) => {
          const active = it.key === activeKey;
          return (
            <Link
              key={it.key}
              href={it.href}
              className={`relative py-3 text-sm ${
                active ? "font-semibold text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {it.label}
              {active ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white/60" /> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


