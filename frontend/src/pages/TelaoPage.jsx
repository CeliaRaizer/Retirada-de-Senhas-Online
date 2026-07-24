/**
 * pages/TelaoPage.jsx
 * Display público — sem autenticação, para TV/projetor
 *
 * Conceito: painel de embarque estilo aeroporto/estação (split-flap board).
 * A senha chamada "vira" como as antigas placas mecânicas de horários —
 * é uma linguagem visual que qualquer pessoa numa sala de espera já
 * reconhece de longe: "preste atenção, algo acabou de mudar aqui".
 */
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:3000";

/* ---------- paleta / tokens ---------- */
const P = {
  bg:        "#08090b",
  board:     "#111316",
  boardEdge: "#1c1f24",
  seam:      "#000000",
  amber:     "#ffb020",
  amberDim:  "#5a4319",
  amberGlow: "rgba(255,176,32,0.35)",
  ink:       "#efe9dd",
  muted:     "#5c6470",
  mutedDim:  "#33383f",
  green:     "#4fd18b",
  red:       "#e0615a",
  fontDisplay: "'Archivo', sans-serif",
  fontMono:    "'Space Mono', monospace",
};

const injectFonts = () => {
  if (document.getElementById("telao-fonts")) return;
  const l = document.createElement("link");
  l.id = "telao-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
};

/* ---------- uma "aba" do painel mecânico (uma letra/dígito) ---------- */
function FlipChar({ char, flipId, size = 1 }) {
  const w = `clamp(${52 * size}px, ${7 * size}vw, ${112 * size}px)`;
  const h = `clamp(${86 * size}px, ${11.5 * size}vw, ${176 * size}px)`;
  const fs = `clamp(${44 * size}px, ${6.2 * size}vw, ${96 * size}px)`;
  return (
    <div
      key={flipId}
      className="flip-char"
      style={{
        width: w, height: h, position: "relative", flexShrink: 0,
        background: `linear-gradient(180deg, #1a1d22 0%, #0e1013 100%)`,
        borderRadius: `${6 * size}px`, boxShadow: `0 0 0 1px ${P.boardEdge}, 0 10px 30px rgba(0,0,0,0.5)`,
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: P.fontMono, fontWeight: 700, fontSize: fs, color: P.amber,
        textShadow: `0 0 22px ${P.amberGlow}`, letterSpacing: "-0.02em",
      }}>
        {char}
      </div>
      {/* vinco central, como nas placas mecânicas reais */}
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "2px",
        background: P.seam, transform: "translateY(-1px)", boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }} />
    </div>
  );
}

function PainelSenha({ senha, flipId }) {
  if (!senha) {
    return (
      <div style={{ textAlign: "center", opacity: 0.35 }}>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "22px" }}>
          {["–", "–", "–", "–"].map((c, i) => <FlipChar key={i} char={c} flipId={`idle-${i}`} />)}
        </div>
        <p style={{ fontFamily: P.fontDisplay, letterSpacing: "0.35em", textTransform: "uppercase",
          fontSize: "clamp(11px, 1.1vw, 15px)", color: P.muted, margin: 0 }}>
          Aguardando chamada
        </p>
      </div>
    );
  }

  const chars = String(senha.numero).split("");
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "26px" }}>
        {chars.map((c, i) => <FlipChar key={i} char={c} flipId={`${flipId}-${i}`} />)}
      </div>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: P.fontDisplay,
        fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase",
        fontSize: "clamp(11px, 1.1vw, 15px)",
        color: senha.tipo === "prioritario" ? P.amber : P.muted,
      }}>
        {senha.tipo === "prioritario" ? "★ Atendimento prioritário" : "Atendimento normal"}
      </span>
    </div>
  );
}

export default function TelaoPage() {
  const [atual, setAtual]         = useState(null);
  const [proximas, setProximas]   = useState([]);
  const [hist, setHist]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [connected, setConnected] = useState(false);
  const [hora, setHora]           = useState(new Date().toLocaleTimeString("pt-BR"));
  const flipCount = useRef(0);
  const [flipId, setFlipId]       = useState(0);

  useEffect(() => { injectFonts(); }, []);

  useEffect(() => {
    const t = setInterval(() => setHora(new Date().toLocaleTimeString("pt-BR")), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const carregarFila = () => {
      fetch(`${API}/api/fila`).then(r => r.json()).then(d => {
        setTotal(d.totalNaFila || 0);
        setProximas((d.fila || []).slice(0, 5));
        if (d.chamando) setAtual(d.chamando);
      }).catch(() => {});
    };
    carregarFila();

    const socket = io(API);
    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("senhaChamada", s => {
      setAtual(prev => { if (prev) setHist(h => [prev, ...h].slice(0, 5)); return s; });
      flipCount.current += 1;
      setFlipId(flipCount.current);
    });
    socket.on("filaAtualizada", carregarFila);
    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: P.bg, color: P.ink, fontFamily: P.fontDisplay,
      display: "grid", gridTemplateRows: "auto 1fr auto auto", position: "relative", overflow: "hidden" }}>

      <style>{`
        @keyframes flipIn {
          0%   { transform: rotateX(-100deg); filter: brightness(0.4); }
          55%  { transform: rotateX(12deg);   filter: brightness(1.3); }
          100% { transform: rotateX(0deg);    filter: brightness(1); }
        }
        .flip-char { animation: flipIn 460ms cubic-bezier(.32,.1,.24,1); transform-origin: 50% 50%; }
        @keyframes dotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .telao-vignette {
          pointer-events: none; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(0,0,0,0.55) 100%);
        }
      `}</style>
      <div className="telao-vignette" />

      {/* Header */}
      <div style={{ padding: "22px 44px", borderBottom: `1px solid ${P.boardEdge}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", color: P.muted,
            fontSize: "clamp(12px,1.1vw,14px)", textDecoration: "none", letterSpacing: "0.02em" }}>
            <span style={{ fontSize: "16px" }}>←</span> Início
          </a>
          <span style={{ width: "1px", height: "18px", background: P.boardEdge }} />
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: P.amber,
                display: "inline-block", animation: "dotPulse 2.4s ease-in-out infinite" }} />
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: P.mutedDim,
                display: "inline-block" }} />
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: P.mutedDim,
                display: "inline-block" }} />
            </div>
            <span style={{ fontWeight: 800, letterSpacing: "0.16em", fontSize: "clamp(13px,1.3vw,17px)",
              color: P.ink, textTransform: "uppercase" }}>
              Painel de Chamadas
            </span>
          </div>
        </div>
        <span style={{ color: P.muted, fontSize: "clamp(15px,1.6vw,20px)", fontFamily: P.fontMono,
          letterSpacing: "0.02em" }}>
          {hora}
        </span>
      </div>

      {/* Centro */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px", zIndex: 1 }}>
        <p style={{ margin: "0 0 26px", fontSize: "clamp(11px,1.1vw,14px)", letterSpacing: "0.4em",
          color: P.mutedDim, textTransform: "uppercase" }}>Senha chamada</p>
        <PainelSenha senha={atual} flipId={flipId} />
      </div>

      {/* Próximas */}
      <div style={{ borderTop: `1px solid ${P.boardEdge}`, padding: "18px 44px", zIndex: 1 }}>
        <p style={{ margin: "0 0 12px", fontSize: "10px", letterSpacing: "0.35em",
          color: P.mutedDim, textTransform: "uppercase" }}>Próximas</p>
        {proximas.length > 0 ? (
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {proximas.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 16px", borderRadius: "6px", background: P.board,
                border: `1px solid ${P.boardEdge}`, opacity: 1 - i * 0.12 }}>
                <span style={{ fontFamily: P.fontMono, fontWeight: 700, fontSize: "clamp(16px,1.6vw,22px)",
                  color: s.tipo === "prioritario" ? P.amber : P.ink }}>
                  {s.numero}
                </span>
                <span style={{ fontSize: "10px", letterSpacing: "0.15em", color: P.muted,
                  textTransform: "uppercase" }}>
                  {s.tipo === "prioritario" ? "★ Prior." : "Normal"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "13px", color: P.mutedDim }}>Fila vazia no momento</p>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: `1px solid ${P.boardEdge}`, padding: "16px 44px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap",
        gap: "16px", background: "#0a0b0d", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%",
            background: connected ? P.green : P.red }} />
          <span style={{ color: P.muted, fontSize: "11px", letterSpacing: "0.05em" }}>
            {connected ? "Conectado" : "Reconectando..."}
          </span>
        </div>
        <span style={{ color: P.muted, fontSize: "12px", fontFamily: P.fontMono, letterSpacing: "0.05em" }}>
          Na fila: <strong style={{ color: P.ink }}>{total}</strong>
        </span>
        {hist.length > 0 && (
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <span style={{ color: P.mutedDim, fontSize: "10px", letterSpacing: "0.15em",
              textTransform: "uppercase" }}>Anteriores</span>
            {hist.map((s, i) => (
              <span key={i} style={{ fontFamily: P.fontMono, fontWeight: 700, fontSize: "14px",
                color: i === 0 ? P.muted : P.mutedDim }}>{s.numero}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}