/**
 * pages/TelaoPage.jsx
 * Display público — sem autenticação, para TV/projetor
 */
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:3000";

export default function TelaoPage() {
  const [atual, setAtual]       = useState(null);
  const [hist, setHist]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [connected, setConnected] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [hora, setHora]         = useState(new Date().toLocaleTimeString("pt-BR"));

  useEffect(() => {
    const t = setInterval(() => setHora(new Date().toLocaleTimeString("pt-BR")), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/fila`).then(r => r.json()).then(d => {
      setTotal(d.totalNaFila || 0);
      if (d.chamando) setAtual(d.chamando);
    }).catch(() => {});

    const socket = io(API);
    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("senhaChamada", s => {
      setAtual(prev => { if (prev) setHist(h => [prev, ...h].slice(0, 4)); return s; });
      setAnimating(true);
      setTimeout(() => setAnimating(false), 500);
    });
    socket.on("filaAtualizada", () => {
      fetch(`${API}/api/fila`).then(r => r.json()).then(d => setTotal(d.totalNaFila || 0)).catch(() => {});
    });
    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1b2a", color: "#fff",
      fontFamily: "'Sora', sans-serif", display: "grid", gridTemplateRows: "auto 1fr auto" }}>

      {/* Header */}
      <div style={{ padding: "20px 40px", borderBottom: "1px solid #1a2e42",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🎫</span>
          <span style={{ fontWeight: "700", letterSpacing: "0.06em", fontSize: "14px", color: "#7a9bb8" }}>
            SISTEMA DE ATENDIMENTO
          </span>
        </div>
        <span style={{ color: "#2a4a62", fontSize: "20px", fontVariantNumeric: "tabular-nums", fontWeight: "300" }}>
          {hora}
        </span>
      </div>

      {/* Centro */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px" }}>
        <p style={{ margin: "0 0 20px", fontSize: "13px", letterSpacing: "0.4em",
          color: "#2a4a62", textTransform: "uppercase" }}>Senha chamada</p>

        {atual ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "clamp(100px, 22vw, 220px)", fontWeight: "800", lineHeight: 0.9,
              color: "#4a9eff", letterSpacing: "-0.05em",
              transform: animating ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>{atual.numero}</div>
            <p style={{ margin: "24px 0 0", color: "#2a4a62", letterSpacing: "0.25em",
              textTransform: "uppercase", fontSize: "14px" }}>
              {atual.tipo === "prioritario" ? "⭐ Atendimento Prioritário" : "Atendimento Normal"}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center", opacity: 0.25 }}>
            <p style={{ fontSize: "80px", margin: "0 0 16px" }}>◎</p>
            <p style={{ letterSpacing: "0.25em", textTransform: "uppercase", fontSize: "14px" }}>
              Aguardando chamada
            </p>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: "1px solid #1a2e42", padding: "20px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%",
            background: connected ? "#4caf50" : "#e05555" }} />
          <span style={{ color: "#2a4a62", fontSize: "12px" }}>{connected ? "Conectado" : "Desconectado"}</span>
        </div>
        <span style={{ color: "#2a4a62", fontSize: "13px" }}>
          Na fila: <strong style={{ color: "#7a9bb8" }}>{total}</strong>
        </span>
        {hist.length > 0 && (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ color: "#2a4a62", fontSize: "12px" }}>Anteriores:</span>
            {hist.map((s, i) => (
              <span key={i} style={{ fontWeight: "700", fontSize: "20px",
                color: i === 0 ? "#2a4a62" : "#1a2e42" }}>{s.numero}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}