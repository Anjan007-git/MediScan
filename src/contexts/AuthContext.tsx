import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { supabase } from "@/lib/supabaseClient";
import { firebaseAuth } from "@/lib/firebase";
import {
  type AppAuthUser,
  getSupabaseSession,
  signInSupabaseWithGoogleIdToken,
  toAppAuthUser,
} from "@/lib/firebaseAuthAdapter";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AuthContextValue {
  session: { firebase_uid: string; supabase_user_id: string | null } | null;
  user: AppAuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<{ firebase_uid: string; supabase_user_id: string | null } | null>(null);
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsub = onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
      if (!mounted) return;

      if (!firebaseUser) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        let supabaseSession = await getSupabaseSession();

        if (!supabaseSession && firebaseUser.providerData.some((p) => p.providerId === "google.com")) {
          const idToken = await firebaseUser.getIdToken();
          supabaseSession = await signInSupabaseWithGoogleIdToken(idToken);
        }

        const appUser = toAppAuthUser(firebaseUser, supabaseSession?.user ?? null);
        setSession({ firebase_uid: appUser.firebase_uid, supabase_user_id: appUser.supabase_user_id });
        setUser(appUser);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Load profile when user changes (deferred to avoid blocking auth callback)
  useEffect(() => {
    if (!user) return;
    let active = true;
    setTimeout(async () => {
      let query = supabase.from("profiles").select("display_name, avatar_url, email");
      if (user.supabase_user_id) {
        query = query.eq("user_id", user.supabase_user_id);
      } else if (user.email) {
        query = query.eq("email", user.email);
      } else {
        return;
      }
      const { data } = await query.maybeSingle();
      if (active && data) setProfile(data as Profile);
    }, 0);
    return () => {
      active = false;
    };
  }, [user]);

  const signOut = async () => {
    // IMPORTANT: do NOT remove the per-user mediscan-store-<uid> slot.
    // That data must persist so the same account restores its history on next login.
    try {
      localStorage.removeItem("mediscan-store");
      localStorage.removeItem("mediscan-onboarded");
    } catch {
      /* ignore */
    }
    await firebaseSignOut(firebaseAuth).catch(() => {});
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
