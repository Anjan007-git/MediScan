import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getRedirectResult } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { signInSupabaseWithGoogleIdToken } from "@/lib/firebaseAuthAdapter";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const target = "/";
        const result = await getRedirectResult(firebaseAuth);
        const user = result?.user ?? firebaseAuth.currentUser;
        if (!user) {
          if (!cancelled) navigate("/login", { replace: true });
          return;
        }
        const idToken = await user.getIdToken();
        await signInSupabaseWithGoogleIdToken(idToken);
        if (!cancelled) navigate(target, { replace: true });
      } catch {
        if (!cancelled) navigate("/login", { replace: true });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary-glow/10">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
    </div>
  );
};

export default AuthCallback;
