/**
 * pages/AtendentePage.jsx
 * Área do atendente: login + painel de operação da fila
 * (chamar próxima senha, finalizar, cancelar, acompanhar status do dia)
 */
import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { ModalConfirmar } from "./ClientePage";
import { useTema, ThemeToggle } from "../theme";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const T = {
  bg:       "var(--rs-bg)",
  surface:  "var(--rs-surface)",
  border:   "var(--rs-border)",
  text:     "var(--rs-text)",
  muted:    "var(--rs-muted)",
  accent:   "var(--rs-accent)",
  accentLt: "var(--rs-accent-lt)",
  success:  "var(--rs-success)",
  successLt:"var(--rs-success-lt)",
  danger:   "var(--rs-danger)",
  dangerLt: "var(--rs-danger-lt)",
  warn:     "var(--rs-warn)",
  warnLt:   "var(--rs-warn-lt)",
  font:     "'Sora', sans-serif",
  radius:   "10px",
  shadow:   "var(--rs-shadow)",
};

const injectFont = () => {
  if (document.getElementById("app-font")) return;
  const l = document.createElement("link");
  l.id = "app-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap";
  document.head.appendChild(l);
};

/* Lê o payload de um JWT sem precisar validar assinatura no front
   (só pra exibir nome/email — a validação de verdade é sempre no backend). */
function decodificarToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

const Btn = ({ children, variant = "primary", onClick, disabled, full, small }) => {
  const base = {
    fontFamily: T.font, fontWeight: "600", fontSize: small ? "12px" : "14px",
    border: "none", borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer",
    padding: small ? "6px 14px" : "13px 24px", width: full ? "100%" : "auto",
    transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: T.accent, color: "#fff" },
    outline: { background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}` },
    danger:  { background: T.dangerLt, color: T.danger, border: `1.5px solid #f0b0b0` },
    success: { background: T.successLt, color: T.success, border: `1.5px solid #a0d8b8` },
    ghost:   { background: "transparent", color: "#aabbcc" },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Card = ({ children, style }) => (
  <div style={{ background: T.surface, borderRadius: T.radius, border: `1px solid ${T.border}`,
    boxShadow: T.shadow, padding: "28px", ...style }}>{children}</div>
);

const Badge = ({ status }) => {
  const map = {
    esperando: { bg: T.warnLt, color: T.warn, label: "Aguardando" },
    chamando:  { bg: T.accentLt, color: T.accent, label: "Chamando" },
    atendido:  { bg: T.successLt, color: T.success, label: "Atendido" },
    cancelado: { bg: "#f0f0f0", color: T.muted, label: "Cancelado" },
  };
  const s = map[status] || map.cancelado;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px",
    fontSize: "11px", fontWeight: "600", background: s.bg, color: s.color }}>{s.label}</span>;
};

const Toast = ({ msg }) => {
  if (!msg) return null;
  const isErr = msg.type === "error";
  return <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
    fontSize: "13px", background: isErr ? T.dangerLt : T.successLt,
    color: isErr ? T.danger : T.success,
    border: `1px solid ${isErr ? "#f0b0b0" : "#a0d8b8"}` }}>{msg.text}</div>;
};

/* ==================== LOGIN ATENDENTE ==================== */
function LoginAtendente({ onLogin }) {
  const [tema, alternarTema] = useTema();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API}/auth/atendente/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || "Credenciais inválidas");

      sessionStorage.setItem("atendente_token", data.token);
      onLogin(data.token);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>
      <div style={{ position: "absolute", top: "20px", right: "20px" }}>
        <ThemeToggle tema={tema} onToggle={alternarTema} />
      </div>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: T.accent,
            margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 18px rgba(27,79,138,0.28)" }}>
            <span style={{ fontSize: "24px" }}>🎧</span>
          </div>
          <h1 style={{ fontSize: "21px", fontWeight: "600", color: T.text, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Área do Atendente
          </h1>
          <p style={{ color: T.muted, fontSize: "13px", margin: 0 }}>
            Entre com suas credenciais para operar a fila
          </p>
        </div>

        <Card>
          {err && <Toast msg={{ text: err, type: "error" }} />}

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: "600", color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>E-mail</p>
            <input
              style={{ width: "100%", padding: "12px 14px", boxSizing: "border-box", border: `1.5px solid ${T.border}`, borderRadius: "8px", fontFamily: T.font, fontSize: "14px", color: T.text, background: T.bg, outline: "none" }}
              type="email"
              placeholder="atendente@sistema.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "11px", fontWeight: "600", color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>Senha</p>
            <input
              style={{ width: "100%", padding: "12px 14px", boxSizing: "border-box", border: `1.5px solid ${T.border}`, borderRadius: "8px", fontFamily: T.font, fontSize: "14px", color: T.text, background: T.bg, outline: "none" }}
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          <Btn variant="primary" full onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Btn>

          <p style={{ textAlign: "center", fontSize: "12px", color: T.muted, margin: "20px 0 0" }}>
            <a href="/" style={{ color: T.accent, textDecoration: "none" }}>← Voltar para área do cliente</a>
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ==================== PAINEL DO ATENDENTE ==================== */
function PainelAtendente({ token, onLogout }) {
  const [tema, alternarTema] = useTema();
  const usuario = decodificarToken(token);
  const [senhas, setSenhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(null); // senha sendo cancelada

  // "chamando" atribuída a este atendente é a que ele está atendendo agora.
  // (a coluna atendente_id vem preenchida quando ELE chamou a senha)
  const minhaSenhaAtual = senhas.find(
    s => s.status === "chamando" && (s.atendente_id === usuario?.id || !s.atendente_id)
  );
  const esperando  = senhas.filter(s => s.status === "esperando").length;
  const atendido   = senhas.filter(s => s.status === "atendido").length;
  const cancelado  = senhas.filter(s => s.status === "cancelado").length;

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/senhas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setSenhas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, [token, onLogout]);

  useEffect(() => {
    carregar();
    const socket = io(API || undefined);
    socket.on("filaAtualizada", carregar);
    socket.on("senhaChamada", carregar);
    socket.on("fila_resetada", carregar);
    return () => socket.disconnect();
  }, [carregar]);

  const acao = async (url, method = "PUT") => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}${url}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || data.mensagem || "Erro na operação");
      setMsg({ text: data.message || "Operação realizada!", type: "ok" });
      carregar();
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const confirmarCancelar = () => {
    const s = confirmandoCancelar;
    setConfirmandoCancelar(null);
    acao(`/api/senha/cancelar/${s.id}`);
  };

  const senhasFiltradas = filtro === "todos" ? senhas : senhas.filter(s => s.status === filtro);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <div style={{ background: T.accent, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🎧</span>
          <span style={{ fontWeight: "700", fontSize: "15px", color: "#fff" }}>
            Painel do Atendente{usuario?.nome ? ` · ${usuario.nome}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/telao" target="_blank" style={{ color: "#aabbcc", fontSize: "12px", textDecoration: "none" }}>Abrir telão ↗</a>
          <ThemeToggle tema={tema} onToggle={alternarTema} dark />
          <Btn variant="ghost" small onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
        {msg && <Toast msg={msg} />}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Na fila",        num: esperando,                color: T.warn    },
            { label: "Em atendimento", num: minhaSenhaAtual ? 1 : 0,  color: T.accent  },
            { label: "Atendidos",      num: atendido,                 color: T.success },
            { label: "Cancelados",     num: cancelado,                color: T.muted   },
          ].map(s => (
            <Card key={s.label} style={{ textAlign: "center", padding: "20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "36px", fontWeight: "800", color: s.color, lineHeight: 1 }}>{s.num}</p>
              <p style={{ margin: 0, fontSize: "11px", color: T.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Controles principais */}
        <Card style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              {minhaSenhaAtual ? (
                <>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", color: T.muted, fontWeight: "600" }}>EM ATENDIMENTO</p>
                  <p style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: T.accent, lineHeight: 1 }}>
                    {minhaSenhaAtual.numero}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: T.muted }}>
                    {minhaSenhaAtual.tipo === "prioritario" ? "⭐ Prioritário" : "Normal"}
                    {minhaSenhaAtual.email_usuario ? ` · ${minhaSenhaAtual.email_usuario}` : ""}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "15px", color: T.muted }}>
                  Nenhuma senha em atendimento · <strong style={{ color: T.text }}>{esperando}</strong> aguardando
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {minhaSenhaAtual && (
                <>
                  <Btn variant="success" small onClick={() => acao(`/api/senha/finalizar/${minhaSenhaAtual.id}`)}>✓ Finalizar</Btn>
                  <Btn variant="danger" small onClick={() => setConfirmandoCancelar(minhaSenhaAtual)}>Cancelar</Btn>
                </>
              )}
              <Btn variant="primary" small onClick={() => acao("/api/senha/chamar")}
                disabled={loading || !!minhaSenhaAtual || esperando === 0}>
                Chamar próxima →
              </Btn>
            </div>
          </div>
        </Card>

        {/* Tabela de senhas do dia */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: "8px", overflowX: "auto" }}>
            {[
              { v: "todos",     l: "Todos"          },
              { v: "esperando", l: "Aguardando"     },
              { v: "chamando",  l: "Em atendimento" },
              { v: "atendido",  l: "Atendidos"      },
              { v: "cancelado", l: "Cancelados"     },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFiltro(f.v)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "none",
                  fontFamily: T.font,
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: filtro === f.v ? T.accent : T.bg,
                  color: filtro === f.v ? "#fff" : T.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {f.l}
              </button>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Senha", "Tipo", "Status", "E-mail do cliente", "Ações"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {senhasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: T.muted }}>
                      Nenhuma senha encontrada
                    </td>
                  </tr>
                ) : senhasFiltradas.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "14px 20px", fontWeight: "700", color: T.accent, fontSize: "15px" }}>
                      {s.numero}
                    </td>
                    <td style={{ padding: "14px 20px", color: T.muted }}>
                      {s.tipo === "prioritario" ? "⭐ Prioritário" : "Normal"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <Badge status={s.status} />
                    </td>
                    <td style={{ padding: "14px 20px", color: T.muted }}>{s.email_usuario || "—"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      {(s.status === "esperando" || s.status === "chamando") && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          {s.status === "chamando" && (
                            <Btn variant="success" small onClick={() => acao(`/api/senha/finalizar/${s.id}`)}>Finalizar</Btn>
                          )}
                          <Btn variant="danger" small onClick={() => setConfirmandoCancelar(s)}>Cancelar</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {confirmandoCancelar && (
        <ModalConfirmar
          titulo="Cancelar senha"
          mensagem={`Tem certeza que deseja cancelar a senha ${confirmandoCancelar.numero}? Essa ação não pode ser desfeita.`}
          confirmLabel="Cancelar senha"
          loading={loading}
          onConfirmar={confirmarCancelar}
          onCancelar={() => setConfirmandoCancelar(null)}
        />
      )}
    </div>
  );
}

export default function AtendentePage() {
  injectFont();
  const [token, setToken] = useState(() => sessionStorage.getItem("atendente_token") || null);

  if (!token) return <LoginAtendente onLogin={tk => setToken(tk)} />;

  return <PainelAtendente token={token} onLogout={() => { sessionStorage.removeItem("atendente_token"); setToken(null); }} />;
}