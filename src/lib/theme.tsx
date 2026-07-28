import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx | null>(null);

function readInitial(): Theme {
  return "dark"; // Default SSR theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const storedTheme = localStorage.getItem("theme") as Theme | null;
      if (storedTheme) {
        setThemeState(storedTheme);
      } else {
        const sys = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        setThemeState(sys);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme, mounted]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((p) => (p === "dark" ? "light" : "dark"));

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be used inside ThemeProvider");
  return c;
}

// Inline script ran before hydration to prevent flash. Must be self-contained.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}var r=document.documentElement;if(t==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;
