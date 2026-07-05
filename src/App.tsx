import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResearchProjects from "./pages/ResearchProjects";
import CommunityProjects from "./pages/CommunityProjects";
import Colleges from "./pages/Colleges";
import Researchers from "./pages/Researchers";
import NetworkGraph from "./pages/NetworkGraph";
import Funding from "./pages/Funding";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

// Route protection helper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080d14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        Initializing secure ASTU session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login screen */}
          <Route path="/login" element={<Login />} />

          {/* Secure console routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/research"
            element={
              <ProtectedRoute>
                <ResearchProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/colleges"
            element={
              <ProtectedRoute>
                <Colleges />
              </ProtectedRoute>
            }
          />
          <Route
            path="/researchers"
            element={
              <ProtectedRoute>
                <Researchers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/network"
            element={
              <ProtectedRoute>
                <NetworkGraph />
              </ProtectedRoute>
            }
          />
          <Route
            path="/funding"
            element={
              <ProtectedRoute>
                <Funding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
