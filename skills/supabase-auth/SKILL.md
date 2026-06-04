---
name: supabase-auth
description: Wire email/password authentication in a Vite + React SPA with Supabase Auth — sign in, sign up, forgot-password / reset-link, change password, sign out, plus client-side route protection and a session context. Use when the app is a single-page app (not Next.js) and you need per-user auth without server middleware.
---

# Supabase Auth in a Vite SPA

Covers the full auth surface with `@supabase/supabase-js`. **Note:** the spec mentions
`@supabase/ssr` and "session in middleware" — those are Next.js constructs. This is a Vite
**SPA** with no server runtime, so sessions live in the browser and routes are guarded
client-side. That is a deliberate, documented deviation, not a gap (see Gotchas).

## Step 1 — client with session persistence

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
  // detectSessionInUrl defaults to true — needed for the reset-link flow (Step 4).
);
```

## Step 2 — session context hook

```ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  const signOut = () => supabase.auth.signOut();
  return { user, loading, signOut };
}
```

Subscribe **and** call `getSession()`: the subscription catches future changes, `getSession`
restores an existing session on load.

## Step 3 — the auth actions

```ts
// Sign in
await supabase.auth.signInWithPassword({ email, password });
// Sign up
await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: `${origin}/` },
});
// Forgot password → email a reset link
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/reset-password`,
});
// Change password (while signed in) OR set new one after a reset link
await supabase.auth.updateUser({ password: newPassword });
// Sign out
await supabase.auth.signOut();
```

## Step 4 — reset-password page

The reset email link returns to `/reset-password` with a recovery token in the URL **hash**.
`detectSessionInUrl` turns that into a temporary session, so `updateUser({ password })` works:

```ts
useEffect(() => {
  const type = new URLSearchParams(window.location.hash.substring(1)).get(
    "type",
  );
  if (type !== "recovery") navigate("/auth"); // not a recovery link
}, []);
// form submit → supabase.auth.updateUser({ password })
```

## Step 5 — protect routes (client-side)

```ts
const { user, loading } = useAuth();
if (loading) return <Spinner />;
if (!user) return <Navigate to="/auth" replace />;
// ...protected page
```

All data is also protected at the DB layer by RLS (see `supabase-backend`), so the guard is
UX, not the security boundary.

## Step 6 — dashboard config (do this or email/login breaks)

- **Authentication → URL Configuration → Redirect URLs:** add **both** `http://localhost:8080/**`
  and `https://<your-app>.vercel.app/**`, or `resetPasswordForEmail` links won't redirect.
- **Test user:** Authentication → Users → Add user → set email/password → enable **Auto Confirm**
  (so it works without an email round-trip).

## Gotchas

- **`@supabase/ssr` / middleware is Next.js.** A Vite SPA has no server components or middleware;
  use `@supabase/supabase-js` + client guards. Call this out in the README as a deliberate choice.
- **Redirect URLs allowlist.** The most common "reset link doesn't work on prod" cause — the live
  Vercel URL isn't in the allowlist.
- **Email rate limit (free tier).** ~2–3 confirmation/reset emails per hour. Repeated testing hits
  "email rate limit exceeded" — it's the tier, not your code. Use Auto-Confirm test users.
- **Recovery flow needs `detectSessionInUrl`.** It's on by default; if you disable it, the reset
  link can't establish the session and `updateUser` fails.
- **Display name vs email.** Auth stores the email; keep `display_name` in a `profiles` row and
  fall back to email when it's empty.
