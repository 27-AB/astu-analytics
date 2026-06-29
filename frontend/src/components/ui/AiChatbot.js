import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getServiceUrl } from "../../config/api";

const SUGGESTIONS = [
  "Who is working on solar energy?",
  "Tell me about AI crops project",
  "Which college has highest funding?",
  "Draft a proposal for IoT agriculture",
];

export default function AiChatbot() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "👋 Hi! I am the **ASTU Research AI Copilot**. How can I help you navigate Adama Science & Technology University's telemetry today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const apiBase = getServiceUrl("analytics");

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const msgText = textToSend || input;
    if (!msgText.trim()) return;

    if (!textToSend) setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: msgText }]);
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msgText }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setMessages((prev) => [...prev, { sender: "ai", text: d.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `⚠️ **Error**: ${d.message || "Failed to communicate with AI Copilot."}`,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ **Connection Error**: Could not reach the AI gateway. Please verify the backend services are running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render basic markdown bold/list formatting in chat bubble
  const renderText = (txt) => {
    return txt.split("\n").map((line, idx) => {
      let content = line;
      // Bold replacement **text**
      content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Bullet point replacement
      if (content.trim().startsWith("- ")) {
        content = `• ${content.trim().substring(2)}`;
      }
      return (
        <div key={idx} style={{ margin: "4px 0", lineHeight: "1.4" }} dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1d4ed8, #06b6d4)",
          border: "none",
          color: "white",
          fontSize: 26,
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(6, 182, 212, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Glassmorphic Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 94,
            right: 24,
            width: 380,
            height: 520,
            borderRadius: 16,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 12px 48px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
            fontFamily: "inherit",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(90deg, rgba(29,78,216,0.2), rgba(6,182,212,0.2))",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: loading ? "#f59e0b" : "#10b981",
                  boxShadow: loading ? "0 0 10px #f59e0b" : "0 0 10px #10b981",
                }}
              />
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>ASTU AI Copilot</div>
                <div style={{ color: "#64748b", fontSize: 10 }}>Online & Cached</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: "16px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((m, idx) => {
              const isAi = m.sender === "ai";
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isAi ? "flex-start" : "flex-end",
                    maxWidth: "85%",
                    background: isAi ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #1d4ed8, #2563eb)",
                    border: isAi ? "1px solid rgba(255,255,255,0.06)" : "none",
                    color: isAi ? "#cbd5e1" : "#ffffff",
                    borderRadius: isAi ? "14px 14px 14px 2px" : "14px 14px 2px 14px",
                    padding: "10px 14px",
                    fontSize: 12.5,
                  }}
                >
                  {renderText(m.text)}
                </div>
              );
            })}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "14px 14px 14px 2px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", animation: "bounce 1.4s infinite ease-in-out both" }} />
                <div className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0.2s" }} />
                <div className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0.4s" }} />
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                  }
                `}</style>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && !loading && (
            <div style={{ padding: "0 20px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 20,
                    padding: "6px 12px",
                    color: "#94a3b8",
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.3)";
                    e.currentTarget.style.color = "#22d3ee";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "#94a3b8";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div
            style={{
              padding: 14,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: 8,
              background: "rgba(10, 15, 30, 0.4)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask the AI Copilot..."
              disabled={loading}
              style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#e2e8f0",
                fontSize: 12.5,
                outline: "none",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #06b6d4)",
                border: "none",
                borderRadius: 8,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "white",
              }}
            >
              ➔
            </button>
          </div>
        </div>
      )}
    </>
  );
}
