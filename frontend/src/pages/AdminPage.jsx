/**
 * pages/AdminPage.jsx
 * Painel administrativo com aba de Histórico
 */
import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:3000";

const T = {
  bg:       "#f4f6f9",
  surface:  "#ffffff",
  border:   "#e2e6ec",
  text:     "#0d1b2a",
  muted:    "#7a8899",
  accent:   "#1b4f8a",
  accentLt: "#e8f0fb",
  success:  "#1a7a4a",
  successLt:"#e6f4ed",
  danger:   "#b52a2a",
  dangerLt: "#fdeaea",
  warn:     "#c47c00",
  warnLt:   "#fff8e6",
  font:     "'Sora', sans-serif",
  radius:   "10px",
  shadow:   "0 2px 16px rgba(13,27,42,0.08)",
};

const injectFont = () => {
  if (document.getElementById("app-font")) return;
  const l = document.createElement("link");
  l.id = "app-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap";
  document.head.appendChild(l);
};

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

/* ==================== LOGIN ADMIN ==================== */
function LoginAdmin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async () => {
    setLoading(true); 
    setErr("");
    try {
      const res = await fetch(`${API}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || "Credenciais inválidas");
      
      sessionStorage.setItem("admin_token", data.token);
      onLogin(data.token);
    } catch (e) { 
      setErr(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: T.accent,
            margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "26px" }}>⚙️</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: T.text, margin: "0 0 6px" }}>
            Painel Administrativo
          </h1>
          <p style={{ color: T.muted, fontSize: "13px", margin: 0 }}>
            Acesso restrito para administradores
          </p>
        </div>

        <Card>
          {err && <Toast msg={{ text: err, type: "error" }} />}

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: "600", color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>E-mail</p>
            <input 
              style={{ width: "100%", padding: "12px 14px", boxSizing: "border-box", border: `1.5px solid ${T.border}`, borderRadius: "8px", fontFamily: T.font, fontSize: "14px", color: T.text, background: T.bg, outline: "none" }}
              type="email" 
              placeholder="admin@sistema.com"
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

/* ==================== HISTÓRICO TAB ==================== */
function HistoricoTab({ token }) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [historico, setHistorico] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buscarHistorico = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/historico?data=${data}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataRes = await res.json();
      if (!res.ok) throw new Error(dataRes.erro || "Erro ao carregar");
      setHistorico(dataRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarHistorico(dataSelecionada);
  }, [dataSelecionada]);

  const formatHora = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: "800", margin: 0 }}>📋 Histórico de Atendimentos</h2>
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "8px", border: `1px solid ${T.border}` }}
        />
      </div>

      {historico && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <Card style={{ textAlign: "center" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", margin: "0 0 4px" }}>{historico.total}</p>
            <p style={{ color: T.muted, fontSize: "13px" }}>Total de Senhas</p>
          </Card>
          <Card style={{ textAlign: "center" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", color: T.success, margin: "0 0 4px" }}>{historico.atendidos}</p>
            <p style={{ color: T.success, fontSize: "13px" }}>Atendidos</p>
          </Card>
          <Card style={{ textAlign: "center" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", color: T.danger, margin: "0 0 4px" }}>{historico.cancelados}</p>
            <p style={{ color: T.danger, fontSize: "13px" }}>Cancelados</p>
          </Card>
        </div>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bg }}>
              <th style={{ padding: "14px 20px", textAlign: "left" }}>Senha</th>
              <th style={{ padding: "14px 20px", textAlign: "left" }}>Tipo</th>
              <th style={{ padding: "14px 20px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "left" }}>Cliente</th>
              <th style={{ padding: "14px 20px", textAlign: "left" }}>Horário</th>
            </tr>
          </thead>
          <tbody>
            {historico?.senhas?.map(s => (
              <tr key={s.id} style={{ borderTop: `1px solid ${T.border}` }}>
                <td style={{ padding: "14px 20px", fontWeight: "700" }}>{s.numero}</td>
                <td style={{ padding: "14px 20px" }}>{s.tipo === "prioritario" ? "⭐ Prioritário" : "Normal"}</td>
                <td style={{ padding: "14px 20px" }}><Badge status={s.status} /></td>
                <td style={{ padding: "14px 20px", color: T.muted }}>{s.email_usuario || "—"}</td>
                <td style={{ padding: "14px 20px", color: T.muted }}>{formatHora(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {historico?.senhas?.length === 0 && (
          <p style={{ padding: "60px", textAlign: "center", color: T.muted, fontSize: "15px" }}>
            Nenhum registro encontrado para esta data.
          </p>
        )}
      </Card>
    </div>
  );
}

/* ==================== CONFIGURAÇÕES TAB ==================== */
function ConfigTab({ token }) {
  const [tempo, setTempo] = useState(null);
  const [novoTempo, setNovoTempo] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/config/tempo`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setTempo(d.tempo_medio_atendimento);
        setNovoTempo(String(d.tempo_medio_atendimento));
      });
  }, [token]);

  const salvar = async () => {
    const val = parseInt(novoTempo);
    if (!val || val < 1 || val > 120) {
      setMsg({ text: "Informe um valor entre 1 e 120 minutos.", type: "error" });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/config/tempo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ minutos: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao salvar");
      setTempo(val);
      setMsg({ text: "Tempo atualizado com sucesso!", type: "ok" });
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 24px" }}>⚙️ Configurações</h2>

      <Card style={{ maxWidth: "480px" }}>
        <p style={{ fontSize: "11px", fontWeight: "600", color: T.muted, letterSpacing: "0.08em",
          textTransform: "uppercase", margin: "0 0 6px" }}>Tempo médio por atendimento</p>
        <p style={{ fontSize: "13px", color: T.muted, margin: "0 0 20px" }}>
          Usado para calcular o tempo estimado de espera exibido ao cliente.
        </p>

        {msg && <Toast msg={msg} />}

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <input
            type="number"
            min="1"
            max="120"
            value={novoTempo}
            onChange={e => setNovoTempo(e.target.value)}
            style={{
              width: "100px", padding: "12px 14px", boxSizing: "border-box",
              border: `1.5px solid ${T.border}`, borderRadius: "8px",
              fontFamily: T.font, fontSize: "20px", fontWeight: "700",
              color: T.accent, textAlign: "center", outline: "none",
            }}
          />
          <span style={{ fontSize: "14px", color: T.muted }}>minutos por pessoa</span>
        </div>

        {tempo !== null && (
          <p style={{ fontSize: "12px", color: T.muted, margin: "0 0 20px" }}>
            Valor atual: <strong style={{ color: T.text }}>{tempo} min</strong>
          </p>
        )}

        <Btn variant="primary" onClick={salvar} disabled={loading}>
          {loading ? "Salvando..." : "Salvar alteração"}
        </Btn>
      </Card>
    </div>
  );
}

/* ==================== PAINEL PRINCIPAL ==================== */
function PainelAdmin({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState("painel");
  const [senhas, setSenhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filtro, setFiltro] = useState("todos");

  const senhaAtual = senhas.find(s => s.status === "chamando");
  const esperando = senhas.filter(s => s.status === "esperando").length;
  const atendido = senhas.filter(s => s.status === "atendido").length;
  const cancelado = senhas.filter(s => s.status === "cancelado").length;

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/senhas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setSenhas(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, [token, onLogout]);

  useEffect(() => {
    carregar();
    const socket = io(API);
    socket.on("filaAtualizada", carregar);
    socket.on("senhaChamada", carregar);
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

  const resetar = () => {
    if (!window.confirm("⚠️ Resetar toda a fila do dia?\nTodas as senhas pendentes serão canceladas.")) return;
    acao("/api/senhas/resetar");
  };

  const senhasFiltradas = filtro === "todos" ? senhas : senhas.filter(s => s.status === filtro);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <div style={{ background: T.accent, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>⚙️</span>
          <span style={{ fontWeight: "700", fontSize: "15px", color: "#fff" }}>Painel Administrativo</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/telao" target="_blank" style={{ color: "#aabbcc", fontSize: "12px", textDecoration: "none" }}>Abrir telão ↗</a>
          <Btn variant="ghost" small onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
        {msg && <Toast msg={msg} />}

        <div style={{ marginBottom: "24px", borderBottom: `2px solid ${T.border}` }}>
          <button onClick={() => setActiveTab("painel")} style={{ padding: "12px 28px", fontWeight: activeTab === "painel" ? "700" : "600", border: "none", background: "none", borderBottom: activeTab === "painel" ? `3px solid ${T.accent}` : "3px solid transparent", color: activeTab === "painel" ? T.accent : T.muted }}>
            Painel Atual
          </button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: "12px 28px", fontWeight: activeTab === "historico" ? "700" : "600", border: "none", background: "none", borderBottom: activeTab === "historico" ? `3px solid ${T.accent}` : "3px solid transparent", color: activeTab === "historico" ? T.accent : T.muted }}>
            Histórico por Data
          </button>
          <button onClick={() => setActiveTab("config")} style={{ padding: "12px 28px", fontWeight: activeTab === "config" ? "700" : "600", border: "none", background: "none", borderBottom: activeTab === "config" ? `3px solid ${T.accent}` : "3px solid transparent", color: activeTab === "config" ? T.accent : T.muted }}>
            Configurações
          </button>
        </div>

{activeTab === "painel" ? (
          
  /* ==================== PAINEL ATUAL - COMPLETO ==================== */
  <>
    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
      {[
        { label: "Na fila",        num: esperando,           color: T.warn    },
        { label: "Em atendimento", num: senhaAtual ? 1 : 0,  color: T.accent  },
        { label: "Atendidos",      num: atendido,            color: T.success },
        { label: "Cancelados",     num: cancelado,           color: T.muted   },
      ].map(s => (
        <Card key={s.label} style={{ textAlign: "center", padding: "20px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "36px", fontWeight: "800", color: s.color, lineHeight: 1 }}>{s.num}</p>
          <p style={{ margin: 0, fontSize: "11px", color: T.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
        </Card>
      ))}
    </div>

    {/* Controles Principais */}
    <Card style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          {senhaAtual ? (
            <>
              <p style={{ margin: "0 0 2px", fontSize: "13px", color: T.muted, fontWeight: "600" }}>EM ATENDIMENTO</p>
              <p style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: T.accent, lineHeight: 1 }}>
                {senhaAtual.numero}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: T.muted }}>
                {senhaAtual.tipo === "prioritario" ? "⭐ Prioritário" : "Normal"}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "15px", color: T.muted }}>
              Nenhuma senha em atendimento · <strong style={{ color: T.text }}>{esperando}</strong> aguardando
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {senhaAtual && (
            <>
              <Btn variant="success" small onClick={() => acao(`/api/senha/finalizar/${senhaAtual.id}`)}>✓ Finalizar</Btn>
              <Btn variant="danger"  small onClick={() => acao(`/api/senha/cancelar/${senhaAtual.id}`)}>Cancelar</Btn>
            </>
          )}
          <Btn variant="primary" small onClick={() => acao("/api/senha/chamar")}
            disabled={loading || esperando === 0}>
            Chamar próxima →
          </Btn>
          <Btn variant="outline" small onClick={resetar}>🔄 Resetar fila</Btn>
        </div>
      </div>
    </Card>

    {/* Tabela de Senhas */}
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Filtros */}
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
                      <Btn variant="danger" small onClick={() => acao(`/api/senha/cancelar/${s.id}`)}>Cancelar</Btn>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </>
) : activeTab === "historico" ? (
  <HistoricoTab token={token} />
) : activeTab === "config" ? (
  <ConfigTab token={token} />
) : null}
      </div>
    </div>
  );
  
}

export default function AdminPage() {
  injectFont();
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || null);

  if (!token) return <LoginAdmin onLogin={tk => setToken(tk)} />;

  return <PainelAdmin token={token} onLogout={() => { sessionStorage.removeItem("admin_token"); setToken(null); }} />;
}