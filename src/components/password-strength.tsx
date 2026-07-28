export function scorePassword(pw: string): number {
  const checks = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  return checks.filter(Boolean).length;
}

const LABELS = ["Weak", "Weak", "Fair", "Good", "Strong"] as const;
const COLORS = [
  "bg-muted",
  "bg-destructive",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-emerald-500",
] as const;

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const label = password ? LABELS[score] : "";
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? COLORS[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>8+ characters, uppercase, number, special character.</span>
        {label && <span className="font-medium text-foreground">{label}</span>}
      </div>
    </div>
  );
}
