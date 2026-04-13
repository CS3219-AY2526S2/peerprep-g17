import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { USER_API_URL } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup(username, email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative grid min-h-screen lg:grid-cols-[0.98fr_1.02fr]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-6rem] top-16 h-[28rem] w-[28rem] rounded-full bg-sky-100 blur-[150px] dark:bg-sky-900/20" />
          <div className="absolute right-[-7rem] bottom-0 h-[24rem] w-[24rem] rounded-full bg-emerald-100 blur-[140px] dark:bg-emerald-900/20" />
        </div>

        <section className="relative hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div>
            <Link
              to="/"
              className="brand-wordmark text-2xl text-slate-900 dark:text-slate-100"
            >
              PeerPrep
            </Link>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs text-emerald-700 shadow-sm dark:border-emerald-900/70 dark:bg-slate-900/80 dark:text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-300" />
              New account
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 dark:text-white">
              Start practicing with
              <br />
              <span className="bg-gradient-to-r from-slate-950 via-emerald-800 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-emerald-200 dark:to-slate-300">
                peers in real time.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Create an account to match with others, collaborate live, and build confidence for technical interviews.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-4">
            {[
              "Shared coding sessions",
              "Interview-style practice",
              "Visible progress across pages",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/92 dark:shadow-none sm:p-8">
            <div className="mb-8 text-center lg:text-left">
              <Link
                to="/"
                className="brand-wordmark inline-block text-2xl text-slate-900 dark:text-slate-100 lg:hidden"
              >
                PeerPrep
              </Link>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Create your account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Start practicing with peers today.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with 1 letter and 1 digit
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full"
              size="lg"
              onClick={() => (window.location.href = `${USER_API_URL}/auth/google`)}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              size="lg"
              onClick={() => (window.location.href = `${USER_API_URL}/auth/github`)}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
