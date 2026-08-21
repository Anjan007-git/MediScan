import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth } from "@/lib/firebase";
import { Lock, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : "Please try again.");

  useEffect(() => {
    const urlCode = new URL(window.location.href).searchParams.get("oobCode");
    if (!urlCode) return;
    verifyPasswordResetCode(firebaseAuth, urlCode)
      .then(() => {
        setOobCode(urlCode);
        setReady(true);
      })
      .catch(() => {
        setReady(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, password);
      toast({ title: "Password updated", description: "You can now sign in." });
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-primary/10 via-background to-primary-glow/10">
      <div className="w-full max-w-md glass-strong rounded-[28px] p-7 shadow-float animate-fade-in-up">
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Set new password</h1>
        <p className="text-sm text-muted-foreground mb-5">
          {ready ? "Enter your new password below." : "Verifying reset link..."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" strokeWidth={1.8} />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="flex-1 bg-transparent outline-none text-sm font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !ready}
            className="glossy w-full rounded-full py-3.5 font-bold text-white shadow-glow active:scale-[0.97] transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
