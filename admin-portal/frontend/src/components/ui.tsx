import { useEffect, useRef, useState, type ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      {title && <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>}
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300",
    danger: "bg-red-600 text-white hover:bg-red-500",
    secondary: "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-neutral-600 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-neutral-600 ${props.className ?? ""}`}
    />
  );
}

export interface TagTileItem {
  key: string;
  label: string;
  count: number;
}

/** A row of clickable "tag" tiles — click one to filter, click again (or "All") to clear. */
export function TagTiles({
  tiles,
  selected,
  onSelect,
  allLabel = "All",
  allCount,
}: {
  tiles: TagTileItem[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  allLabel?: string;
  allCount: number;
}) {
  function tileClass(isActive: boolean) {
    return `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
        : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    }`;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onSelect(null)} className={tileClass(selected === null)}>
        {allLabel} <span className="opacity-60">({allCount})</span>
      </button>
      {tiles.map((tile) => (
        <button key={tile.key} type="button" onClick={() => onSelect(tile.key)} className={tileClass(selected === tile.key)}>
          {tile.label} <span className="opacity-60">({tile.count})</span>
        </button>
      ))}
    </div>
  );
}

export function reasonTone(reason: string): "green" | "blue" | "neutral" | "red" {
  if (reason === "department") return "green";
  if (reason === "individual" || reason === "project") return "blue";
  return "red";
}

/** Checkbox-based multi-select dropdown — friendlier than a native ctrl+click <select multiple>. */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select tools…",
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-64 items-center justify-between rounded border border-neutral-300 bg-white px-3 py-1.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-neutral-600"
      >
        <span className={selected.length ? "" : "text-neutral-500"}>
          {selected.length > 0 ? `${selected.length} tool${selected.length > 1 ? "s" : ""} selected` : placeholder}
        </span>
        <span className="text-neutral-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-64 overflow-y-auto rounded border border-neutral-300 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded" />
              <span className="font-mono">{opt}</span>
            </label>
          ))}
          {options.length === 0 && <p className="px-2 py-1.5 text-sm text-neutral-500">No tools available.</p>}
        </div>
      )}
    </div>
  );
}
