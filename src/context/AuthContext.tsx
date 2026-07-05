import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getServiceUrl } from "../config/api";

const API = getServiceUrl("auth");

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "admin" | "researcher" | "viewer";
  college: string;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => void;
  updateSession: (newToken: string | null, newUser: UserSession | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("astu_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setUser(d.user);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<UserSession> => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Login failed");
    localStorage.setItem("astu_token", data.token);
    setToken(data.token);
    const sessionUser = {
      id: data.user.id || data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      college: data.user.college
    };
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("astu_token");
    setToken(null);
    setUser(null);
  };

  const updateSession = (newToken?: string, newUser?: any) => {
    if (newToken) {
      localStorage.setItem("astu_token", newToken);
      setToken(newToken);
    }
    if (newUser) {
      setUser({
        id: newUser.id || newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        college: newUser.college,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
