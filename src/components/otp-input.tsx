import { useRef, useEffect } from "react";

export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (value.length === 6) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setDigit = (i: number, d: string) => {
    const clean = d.replace(/\D/g, "");
    if (!clean && d !== "") return;
    const arr = value.padEnd(6, " ").split("");
    if (clean.length > 1) {
      // paste
      const pasted = clean.slice(0, 6 - i);
      for (let j = 0; j < pasted.length; j++) arr[i + j] = pasted[j];
      const v = arr.join("").trim();
      onChange(v.slice(0, 6));
      const next = Math.min(i + pasted.length, 5);
      refs.current[next]?.focus();
      return;
    }
    arr[i] = clean || " ";
    const v = arr.join("").replace(/\s+$/, "");
    onChange(v.slice(0, 6));
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div className={`flex gap-2 ${invalid ? "animate-shake" : ""}`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          className={`h-12 w-11 rounded-md border bg-surface text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring ${invalid ? "border-red-500 text-red-600" : ""}`}
        />
      ))}
    </div>
  );
}
