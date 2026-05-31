import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = auth
  const [error, setError] = useState("");

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  async function login(email, password) {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return true;
    } catch (e) {
      setError(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
      return false;
    }
  }

  async function register(payload) {
    setError("");
    try {
      const { data } = await api.post("/auth/register", payload);
      setUser(data);
      return true;
    } catch (e) {
      setError(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
      return false;
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (_) {
      /* ignore */
    }
    setUser(false);
  }

  return (
    <AuthCtx.Provider value={{ user, error, login, register, logout, refresh: fetchMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
