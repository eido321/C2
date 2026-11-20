import {useState, type FormEvent} from 'react';
import {library} from '@/lib/library';

export function LoginScreen({onLogin, onBack}: {onLogin: (name: string) => void; onBack: () => void}) {
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      const result = await library<{username: string}>(signUp ? 'register' : 'login', values);
      onLogin(result.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }
  return <main className="parchment fixed inset-0 z-50 overflow-y-auto px-5 py-16">
    <section className="screen-enter mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <h1 className="font-display text-3xl font-bold">{signUp ? 'Create an account' : 'Sign in'}</h1>
      <form onSubmit={authenticate} className="mt-5 grid gap-3 text-sm">
        <label>Username<input autoFocus required name="username" autoComplete="username" className="mt-1 block w-full rounded border p-2" /></label>
        <label>Password<input required name="password" type="password" minLength={signUp ? 6 : 1} autoComplete={signUp ? 'new-password' : 'current-password'} className="mt-1 block w-full rounded border p-2" /></label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">{signUp ? 'Create account' : 'Sign in'}</button>
        <button type="button" disabled={busy} className="py-2 text-accent" onClick={() => {setSignUp(!signUp); setError('');}}>{signUp ? 'Use existing account' : 'Create an account'}</button>
      </form>
      <button disabled={busy} className="mt-4 text-sm text-accent hover:underline" onClick={onBack}>Continue without signing in</button>
    </section>
  </main>;
}

