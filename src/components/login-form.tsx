"use client";

import { useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("ההתחברות נכשלה. בדקו את הפרטים ונסו שוב.");
        setPending(false);
        return;
      }

      // Full navigation so auth cookies are included on the next request.
      window.location.assign(nextPath);
    } catch {
      setError("אירעה שגיאה. נסו שוב מאוחר יותר.");
      setPending(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        דוא״ל
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          dir="ltr"
        />
      </label>
      <label>
        סיסמה
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
        />
      </label>
      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "מתחבר…" : "התחברות"}
      </button>
    </form>
  );
}
