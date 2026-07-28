import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

export function FloatingThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      suppressHydrationWarning
      className="fixed bottom-5 left-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-foreground/80 shadow-lg backdrop-blur-md transition hover:border-primary/50 hover:text-foreground"
    >
      <span suppressHydrationWarning className="contents">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}
