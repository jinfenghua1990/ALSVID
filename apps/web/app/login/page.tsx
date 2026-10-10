'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/session/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message ?? 'Unable to sign in');
      setBusy(false);
      return;
    }
    router.push('/partners');
    router.refresh();
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="brand">ALSVID</div>
        <div className="eyebrow">INTERNAL CONTROL PLANE</div>
        <h1 className="authTitle">Sign in to operate ALSVID.</h1>
        <form className="stack" onSubmit={submit}>
          <label>Email<input name="email" type="email" autoComplete="username" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          {error ? <p className="formError">{error}</p> : null}
          <button className="primaryButton" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
