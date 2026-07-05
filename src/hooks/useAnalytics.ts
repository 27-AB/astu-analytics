import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getServiceUrl } from "../config/api";

const API = getServiceUrl("analytics");

export const useAnalytics = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load analytics");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export const useApiFetch = (url: string) => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token || !url) return;
    setLoading(true);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
