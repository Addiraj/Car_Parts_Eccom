import { useEffect, useState } from "react";

export function useCountdown(endIso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endIso) return null;
  const end = new Date(endIso).getTime();
  const ms = Math.max(0, end - now);
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { ms, days, hours, minutes, seconds, expired: ms <= 0 };
}

export function Countdown({ endIso, compact }: { endIso: string; compact?: boolean }) {
  const c = useCountdown(endIso);
  if (!c) return null;
  if (c.expired) return <span className="text-xs text-muted-foreground">Expired</span>;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (compact) {
    return (
      <span className="font-mono text-xs tabular-nums">
        {c.days > 0 ? `${c.days}d ` : ""}
        {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
      {c.days > 0 && (
        <Box>{c.days}<small className="ms-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">d</small></Box>
      )}
      <Box>{pad(c.hours)}<small className="ms-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">h</small></Box>
      <Box>{pad(c.minutes)}<small className="ms-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">m</small></Box>
      <Box>{pad(c.seconds)}<small className="ms-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">s</small></Box>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-foreground">
      {children}
    </span>
  );
}
