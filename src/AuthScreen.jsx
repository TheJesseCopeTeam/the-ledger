import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  paper: "#f4f5f7", paperSoft: "#e5e7eb", ink: "#1f2937",
  inkSoft: "#6b7280", inkLine: "#d1d5db", accent: "#4b5563", red: "#b04a4a"
};

export default function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Account created. Check your email if confirmation is required, then sign in.");
      }
    } catch (e) {
      setErr(e.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.paper }}>
      <div className="w-full max-w-md p-8 rounded-lg" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl" style={{ color: C.ink }}>The Ledger</h1>
          <p className="font-serif italic text-sm mt-1" style={{ color: C.inkSoft }}>Bookkeeping across your companies</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="block w-full mt-1 px-3 py-2 rounded font-sans text-sm"
              style={{ background: C.paper, border: `1px solid ${C.inkLine}`, color: C.ink }} />
          </div>
          <div>
            <label className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="block w-full mt-1 px-3 py-2 rounded font-sans text-sm"
              style={{ background: C.paper, border: `1px solid ${C.inkLine}`, color: C.ink }} />
          </div>

          {err && <p className="text-sm font-sans" style={{ color: C.red }}>{err}</p>}
          {info && <p className="text-sm font-sans" style={{ color: C.ink }}>{info}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2 rounded font-sans font-medium text-sm"
            style={{ background: C.accent, color: C.paper, opacity: loading ? 0.5 : 1 }}>
            {loading ? "Working…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(""); setInfo(""); }}
            className="font-sans text-xs underline" style={{ color: C.inkSoft }}>
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
