import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSession } from "@/lib/auth.functions";

type User = { id: string; email: string };
type Profile = any; // You can refine this with your actual profile type

type AuthContextType = {
  session: { access_token: string } | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setAuth: (token: string, user: User, profile?: Profile) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("jwt_token");
      const lastActive = localStorage.getItem("last_active_at");
      const TWO_HOURS = 2 * 60 * 60 * 1000;

      if (token) {
        if (lastActive && Date.now() - parseInt(lastActive, 10) > TWO_HOURS) {
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("last_active_at");
          window.location.href = "/login?reason=inactivity";
          setLoading(false);
          return;
        }

        try {
          const result = await getSession({ data: { token } });
          if (result.user) {
            localStorage.setItem("last_active_at", Date.now().toString());
            setSession({ access_token: token });
            setUser(result.user);
            setProfile(result.profile);
          } else {
            localStorage.removeItem("jwt_token");
            localStorage.removeItem("last_active_at");
          }
        } catch (err: any) {
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("last_active_at");
          if (err?.message?.includes("inactivity")) {
            window.location.href = "/login?reason=inactivity";
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const setAuth = (token: string, u: User, p?: Profile) => {
    localStorage.setItem("jwt_token", token);
    localStorage.setItem("last_active_at", Date.now().toString());
    setSession({ access_token: token });
    setUser(u);
    if (p) setProfile(p);
  };

  const logout = async () => {
    try {
      if (session) {
        const { logLogout } = await import("@/lib/security.functions");
        await logLogout();
      }
    } catch { /* ignore */ }
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("last_active_at");
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
