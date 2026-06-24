import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import AuthScreen from "./AuthScreen.jsx";
import App from "./App.jsx";

export default function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f7", color: "#6b7280", fontFamily: "Fraunces, serif", fontStyle: "italic" }}>
        Loading…
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  return <App onSignOut={() => supabase.auth.signOut()} />;
}
