import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";

import { DEMO_ACCOUNTS } from "../lib/demo-accounts";
import { useAuth } from "../state/AuthContext";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="Product introduction">
        <Link className="brand" to="/" aria-label="Sales analytics dashboard home">
          <span className="brand-mark" aria-hidden="true">
            SA
          </span>
          <span className="brand-copy">
            <strong>Sales Analytics</strong>
            <span>Operations dashboard</span>
          </span>
        </Link>
        <div className="auth-message">
          <p className="eyebrow">Decision-ready reporting</p>
          <h1>See the trend before the meeting starts.</h1>
          <p>
            Turn sales and production data into a clear view of what is moving,
            where, and by how much.
          </p>
        </div>
        <p className="auth-footnote">
          Secure access for authenticated managers and administrators.
        </p>
      </section>

      <section className="auth-panel" aria-labelledby="login-title">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 id="login-title">Welcome back</h2>
          <p className="auth-form-intro">Log in to access your dashboard.</p>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>

          {error ? (
            <p className="inline-note error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="demo-accounts" aria-label="Demo accounts">
            <p className="demo-accounts-label">Demo accounts — click to fill</p>
            <div className="demo-account-row">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  className="demo-account"
                  title={`${account.email} — ${account.hint}`}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError(null);
                  }}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>

          <p className="form-help">
            <a href="#reset-password">Forgot your password?</a>
          </p>
        </form>
      </section>
    </main>
  );
}
