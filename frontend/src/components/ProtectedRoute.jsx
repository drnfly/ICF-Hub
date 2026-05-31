import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-zinc-500 font-display tracking-wider text-sm uppercase">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
