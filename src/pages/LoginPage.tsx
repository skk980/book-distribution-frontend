import { FormEvent, useState } from "react";
import { loginAdmin, registerAdmin } from "../apis/client";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await registerAdmin({ name, email, password });
      } else {
        await loginAdmin({ email, password });
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Something went wrong, please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-900 text-center">
          ISKCON Book Distribution
        </h1>
        <p className="text-xs text-slate-500 text-center">
          {mode === "login"
            ? "Login as admin to manage books and trips."
            : "Create an admin account for this system."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Name</label>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center rounded-xl bg-slate-900 text-white text-sm px-4 py-2.5 hover:bg-slate-800 disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create Admin"}
          </button>
        </form>

        <button
          type="button"
          className="w-full text-xs text-slate-500 mt-2"
          onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
        >
          {mode === "login"
            ? "New here? Create admin account"
            : "Already have account? Login"}
        </button>
      </div>
    </div>
  );
}
