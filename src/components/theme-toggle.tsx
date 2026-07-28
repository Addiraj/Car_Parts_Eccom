import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      suppressHydrationWarning
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface/40 text-foreground/80 transition hover:border-primary/50 hover:text-foreground ${className}`}
    >
      <span suppressHydrationWarning className="contents">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}
