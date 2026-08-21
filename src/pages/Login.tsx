import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth, googleProvider } from "@/lib/firebase";
import {
  signInSupabaseWithEmail,
  signInSupabaseWithGoogleIdToken,
  signUpSupabaseWithEmail,
} from "@/lib/firebaseAuthAdapter";
import { Loader2, Mail, Lock, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const initialMode = new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "signin";
  const redirectAfterLogin = (location.state as { from?: string } | null)?.from || "/";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Please try again.";

  useEffect(() => {
    if (!authLoading && session) navigate(redirectAfterLogin, { replace: true });
  }, [session, authLoading, navigate, redirectAfterLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const fullName = name.trim() || email.split("@")[0];
        const creds = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(creds.user, { displayName: fullName }).catch(() => {});
        await signUpSupabaseWithEmail(email, password, fullName);
        await sendEmailVerification(creds.user).catch(() => {});
        await signOut(firebaseAuth).catch(() => {});
        await supabase.auth.signOut();
        toast({ title: "Check your email", description: "Confirm your email to finish signing up." });
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        try {
          await signInSupabaseWithEmail(email, password);
        } catch (error) {
          await signOut(firebaseAuth).catch(() => {});
          throw error;
        }
        navigate(redirectAfterLogin, { replace: true });
      }
    } catch (err: unknown) {
      toast({
        title: mode === "signup" ? "Sign up failed" : "Sign in failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      await signInSupabaseWithGoogleIdToken(idToken);
      navigate(redirectAfterLogin, { replace: true });
    } catch (err: unknown) {
      await signOut(firebaseAuth).catch(() => {});
      toast({ title: "Google sign-in failed", description: getErrorMessage(err), variant: "destructive" });
      setBusy(false);
    }
  };

  if (authLoading || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary-glow/10">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-primary/10 via-background to-primary-glow/10">
      <div className="w-full max-w-md glass-strong rounded-[28px] p-7 shadow-float animate-fade-in-up">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow mb-3 relative overflow-hidden"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
            <ShieldCheck className="relative w-8 h-8 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {mode === "signin"
              ? "Sign in to access your medicine scans"
              : "Start scanning medicines in seconds"}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full glass rounded-full py-3 flex items-center justify-center gap-2 font-semibold text-sm active:scale-[0.98] transition disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === "signup" && (
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.8} />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 bg-transparent outline-none text-sm font-medium"
              />
            </div>
          )}
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" strokeWidth={1.8} />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 bg-transparent outline-none text-sm font-medium"
            />
          </div>
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" strokeWidth={1.8} />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 bg-transparent outline-none text-sm font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary active:scale-90 transition-all duration-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 transition-opacity duration-200" strokeWidth={1.75} />
              ) : (
                <Eye className="w-4 h-4 transition-opacity duration-200" strokeWidth={1.75} />
              )}
            </button>
          </div>

          {mode === "signin" && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="glossy w-full rounded-full py-3.5 font-bold text-white shadow-glow active:scale-[0.97] transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09A6.94 6.94 0 0 1 5.5 12c0-.72.13-1.42.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

export default Login;
