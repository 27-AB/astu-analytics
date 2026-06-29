import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout       from "./components/layout/Layout";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import ResearchProjects  from "./pages/ResearchProjects";
import CommunityProjects from "./pages/CommunityProjects";
import Colleges     from "./pages/Colleges";
import Researchers  from "./pages/Researchers";
import NetworkGraph from "./pages/NetworkGraph";
import Funding      from "./pages/Funding";
import Reports      from "./pages/Reports";
import Settings     from "./pages/Settings";

// Protect every route — redirect to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#080d14", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(34,211,238,0.2)", borderTopColor:"#22d3ee", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/research"    element={<ProtectedRoute><ResearchProjects /></ProtectedRoute>} />
          <Route path="/community"   element={<ProtectedRoute><CommunityProjects /></ProtectedRoute>} />
          <Route path="/colleges"    element={<ProtectedRoute><Colleges /></ProtectedRoute>} />
          <Route path="/researchers" element={<ProtectedRoute><Researchers /></ProtectedRoute>} />
          <Route path="/network"     element={<ProtectedRoute><NetworkGraph /></ProtectedRoute>} />
          <Route path="/funding"     element={<ProtectedRoute><Funding /></ProtectedRoute>} />
          <Route path="/reports"     element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
