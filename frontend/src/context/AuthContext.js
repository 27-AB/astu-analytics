import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
import { getServiceUrl } from "../config/api";

const API = getServiceUrl("auth");

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(localStorage.getItem("astu_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { 
          if (d.success) {
            setUser({ ...d.user, id: d.user._id || d.user.id }); 
          } else {
            logout(); 
          }
        })
        .catch(logout)
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    localStorage.setItem("astu_token", data.token);
    setToken(data.token);
    const normalizedUser = { ...data.user, _id: data.user.id || data.user._id };
    setUser(normalizedUser);
    return normalizedUser;
  };

  const logout = () => {
    localStorage.removeItem("astu_token");
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
