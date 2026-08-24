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
      if (token) {
        try {
          const result = await getSession({ data: { token } });
          if (result.user) {
            setSession({ access_token: token });
            setUser(result.user);
            setProfile(result.profile);
          } else {
            localStorage.removeItem("jwt_token");
          }
        } catch (err) {
          localStorage.removeItem("jwt_token");
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const setAuth = (token: string, u: User, p?: Profile) => {
    localStorage.setItem("jwt_token", token);
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
