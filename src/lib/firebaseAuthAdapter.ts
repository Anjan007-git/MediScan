import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { User as FirebaseUser } from "firebase/auth";
import { supabase } from "@/lib/supabaseClient";

export interface AppAuthUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  firebase_uid: string;
  supabase_user_id: string | null;
}

const sanitizeMetadata = (
  firebaseUser: FirebaseUser,
  supabaseUser?: SupabaseUser | null,
): Record<string, unknown> => ({
  ...(supabaseUser?.user_metadata ?? {}),
  full_name: firebaseUser.displayName ?? supabaseUser?.user_metadata?.full_name,
  name: firebaseUser.displayName ?? supabaseUser?.user_metadata?.name,
  avatar_url: firebaseUser.photoURL ?? supabaseUser?.user_metadata?.avatar_url,
  email: firebaseUser.email ?? supabaseUser?.email ?? null,
  firebase_uid: firebaseUser.uid,
});

export const toAppAuthUser = (
  firebaseUser: FirebaseUser,
  supabaseUser?: SupabaseUser | null,
): AppAuthUser => {
  const supabaseUserId = supabaseUser?.id ?? null;

  return {
    id: supabaseUserId ?? firebaseUser.uid,
    email: firebaseUser.email ?? supabaseUser?.email ?? null,
    user_metadata: sanitizeMetadata(firebaseUser, supabaseUser),
    firebase_uid: firebaseUser.uid,
    supabase_user_id: supabaseUserId,
  };
};

export const getSupabaseSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

export const signInSupabaseWithEmail = async (email: string, password: string): Promise<Session | null> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session ?? null;
};

export const signUpSupabaseWithEmail = async (
  email: string,
  password: string,
  fullName: string,
): Promise<Session | null> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  return data.session ?? null;
};

export const signInSupabaseWithGoogleIdToken = async (token: string): Promise<Session | null> => {
  const authApi = supabase.auth as unknown as {
    signInWithIdToken?: (args: { provider: "google"; token: string }) => Promise<{
      data: { session: Session | null };
      error: Error | null;
    }>;
  };

  if (!authApi.signInWithIdToken) {
    throw new Error("Supabase client does not support signInWithIdToken.");
  }

  const { data, error } = await authApi.signInWithIdToken({ provider: "google", token });
  if (error) throw error;
  return data.session ?? null;
};
