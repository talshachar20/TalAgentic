"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 animate-fade-in">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-calm-100 rounded-2xl mb-4 shadow-sm hover:bg-calm-200 transition-colors">
              <svg
                className="w-7 h-7 text-calm-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.2 5.4-5 8-9 9 0 5 4 9 9 9s9-4 9-9c-4-1-7.8-3.6-9-9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v9" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-calm-800 tracking-tight">
            Create your space
          </h1>
          <p className="text-slate-500 mt-1.5 text-base">
            Save your sessions and revisit them anytime
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-600 mb-1.5"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name or nickname"
              required
              autoComplete="given-name"
              className="w-full px-4 py-3 bg-white border border-calm-200 rounded-xl text-slate-700 placeholder-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-600 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-white border border-calm-200 rounded-xl text-slate-700 placeholder-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-600 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-white border border-calm-200 rounded-xl text-slate-700 placeholder-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name || !email || !password}
            className="w-full mt-2 px-6 py-3.5 bg-calm-600 hover:bg-calm-700 disabled:bg-calm-200 disabled:text-calm-400 text-white font-medium rounded-2xl transition-colors duration-200 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-calm-500 focus:ring-offset-2"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-calm-600 hover:text-calm-700 font-medium"
            >
              Sign in
            </Link>
          </p>
          <Link
            href="/"
            className="block text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Continue without an account →
          </Link>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
          Your conversations are private. We never share them with third parties.
        </p>
      </div>
    </div>
  );
}
