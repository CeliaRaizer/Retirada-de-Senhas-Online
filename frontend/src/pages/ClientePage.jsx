/**
 * pages/ClientePage.jsx
 * Tela do cliente — login Google + painel de senha
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
    transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1, letterSpacing: "0.01em",
  };
  const variants = {
    primary: { background: T.accent,    color: "#fff" },
    outline: { background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}` },
    danger:  { background: T.dangerLt,  color: T.danger,  border: `1.5px solid #f0b0b0` },
    ghost:   { background: "transparent", color: T.muted },
    google:  { background: "#fff", color: T.text, border: `1.5px solid ${T.border}`,
               boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Card = ({ children, style, ...rest }) => (
  <div style={{ background: T.surface, borderRadius: T.radius, border: `1px solid ${T.border}`,
    boxShadow: T.shadow, padding: "32px", ...style }} {...rest}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const map = {
    esperando: { bg: T.warnLt,    color: T.warn,    label: "Aguardando" },
    chamando:  { bg: T.accentLt,  color: T.accent,  label: "Chamando!"  },
    atendido:  { bg: T.successLt, color: T.success, label: "Atendido"   },
    cancelado: { bg: "#f0f0f0",   color: T.muted,   label: "Cancelado"  },
  };
  const s = map[status] || map.cancelado;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px",
    fontSize: "11px", fontWeight: "600", letterSpacing: "0.04em",
    background: s.bg, color: s.color }}>{s.label}</span>;
};

const Toast = ({ msg }) => {
  if (!msg) return null;
  const isErr = msg.type === "error";
  return <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
    fontSize: "13px", fontWeight: "500",
    background: isErr ? T.dangerLt : T.successLt,
    color: isErr ? T.danger : T.success,
    border: `1px solid ${isErr ? "#f0b0b0" : "#a0d8b8"}` }}>{msg.text}</div>;
};

const Label = ({ children }) => (
  <p style={{ fontSize: "11px", fontWeight: "600", color: T.muted, letterSpacing: "0.08em",
    textTransform: "uppercase", marginBottom: "8px", marginTop: 0 }}>{children}</p>
);

const Divider = () => <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "24px 0" }} />;

/* ── ÍCONE GOOGLE (reutilizado em vários botões) ── */
const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px",
  border: `1px solid ${T.border}`, fontSize: "14px", fontFamily: T.font, outline: "none",
};

/* Cada navegador guarda seu próprio identificador — é assim que
   sabemos que "esse dispositivo" já retirou uma senha de visitante,
   sem precisar de conta nenhuma. */
function getDispositivoId() {
  let id = localStorage.getItem("dispositivo_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("dispositivo_id", id);
  }
  return id;
}

/* ── MODAL: escolher tipo de atendimento (retirada como visitante) ── */
function ModalTipoVisitante({ onClose, onConfirmar, loading }) {
  const [tipo, setTipo] = useState("normal");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(13,27,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "420px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: T.text }}>Tipo de atendimento</h3>
            <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none",
              cursor: "pointer", fontSize: "20px", color: T.muted, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "22px" }}>
            {[
              { v: "normal",      icon: "🏷️", label: "Normal",      desc: "Atendimento padrão"    },
              { v: "prioritario", icon: "⭐", label: "Prioritário", desc: "Gestantes, idosos, PCD" },
            ].map(t => (
              <div key={t.v} onClick={() => setTipo(t.v)} style={{
                padding: "16px", borderRadius: "8px", cursor: "pointer",
                border: `2px solid ${tipo === t.v ? T.accent : T.border}`,
                background: tipo === t.v ? T.accentLt : T.surface, transition: "all 0.15s",
              }}>
                <p style={{ margin: "0 0 4px", fontSize: "22px" }}>{t.icon}</p>
                <p style={{ margin: "0 0 2px", fontWeight: "600", fontSize: "14px",
                  color: tipo === t.v ? T.accent : T.text }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: "11px", color: T.muted }}>{t.desc}</p>
              </div>
            ))}
          </div>
          <Btn variant="primary" full onClick={() => onConfirmar(tipo)} disabled={loading}>
            {loading ? "Retirando..." : "Confirmar e retirar senha"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

/* ── LANDING PAGE ── */
function LandingCliente({ onGoogle, onLoginSuccess }) {
  const [modo, setModo] = useState("login"); // "login" | "cadastro"
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [ticketVisitante, setTicketVisitante] = useState(() => {
    try { return JSON.parse(localStorage.getItem("visitante_ticket")) || null; }
    catch { return null; }
  });

  const salvarTicketVisitante = (senha) => {
    const registro = { numero: senha.numero, codigoAcesso: senha.codigoAcesso };
    localStorage.setItem("visitante_ticket", JSON.stringify(registro));
    setTicketVisitante(registro);
  };

  const entrarOuCadastrar = async () => {
    setLoading(true); setMsg(null);
    try {
      const rota = modo === "login" ? "/auth/cliente/login" : "/auth/cliente/registro";
      const body = modo === "login"
        ? { email: form.email, senha: form.senha }
        : { nome: form.nome, email: form.email, senha: form.senha };

      const res = await fetch(`${API}${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || "Não foi possível continuar");
      onLoginSuccess(data.token);
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const retirarComoVisitante = async (tipo) => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/senha/anonima`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, dispositivoId: getDispositivoId() }),
      });
      const data = await res.json();

      if (res.status === 409) {
        salvarTicketVisitante(data.senha);
        setMsg({ text: "Este dispositivo já tem uma senha ativa.", type: "error" });
      } else if (!res.ok) {
        throw new Error(data.erro || data.mensagem || "Não foi possível retirar a senha");
      } else {
        salvarTicketVisitante(data);
        setMsg({ text: `Senha ${data.numero} retirada com sucesso!`, type: "ok" });
      }
      setModalAberto(false);
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`
        .rs-nav-links { display: flex; align-items: center; gap: 36px; }
        .rs-nav-toggle { display: none; background: none; border: none; cursor: pointer;
          font-size: 22px; color: ${T.text}; line-height: 1; padding: 4px; }
        .rs-nav-mobile { display: none; }
        .rs-hero-grid { display: grid; grid-template-columns: 1fr 400px; gap: 48px; align-items: start; }
        @media (max-width: 900px) {
          .rs-hero-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 680px) {
          .rs-nav-links > a { display: none; }
          .rs-nav-toggle { display: inline-flex; }
          .rs-nav-mobile.rs-nav-mobile--open { display: flex; }
          .rs-info-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* NAV */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
        <div className="rs-nav-links">
          <span style={{ fontWeight: "800", fontSize: "16px", color: T.text }}>Retirada de Senhas</span>
          <a href="#como-funciona" style={{ color: T.muted, fontSize: "14px", textDecoration: "none" }}>Como funciona</a>
          <a href="/telao" style={{ color: T.muted, fontSize: "14px", textDecoration: "none" }}>Painel</a>
        </div>
        <button className="rs-nav-toggle" aria-label="Abrir menu" onClick={() => setMenuAberto(v => !v)}>
          {menuAberto ? "✕" : "☰"}
        </button>
      </div>

      {menuAberto && (
        <div className="rs-nav-mobile rs-nav-mobile--open" style={{ flexDirection: "column",
          background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "8px 24px 16px" }}>
          <a href="#como-funciona" onClick={() => setMenuAberto(false)}
            style={{ color: T.text, fontSize: "14px", textDecoration: "none", padding: "10px 0" }}>Como funciona</a>
          <a href="/telao" onClick={() => setMenuAberto(false)}
            style={{ color: T.text, fontSize: "14px", textDecoration: "none", padding: "10px 0" }}>Painel</a>
        </div>
      )}

      {/* HERO — ocupa quase a tela toda; os cards de baixo só aparecem ao rolar */}
      <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center" }}>
        <div className="rs-hero-grid" style={{ maxWidth: "1080px", margin: "0 auto", padding: "48px 24px",
          width: "100%", boxSizing: "border-box" }}>

        <div>
          <span style={{ display: "inline-block", background: T.accentLt, color: T.accent,
            fontSize: "12px", fontWeight: "700", padding: "6px 14px", borderRadius: "20px", marginBottom: "22px" }}>
            Atendimento sem filas físicas
          </span>
          <h1 style={{ fontSize: "40px", fontWeight: "800", color: T.text, lineHeight: 1.15, margin: "0 0 16px" }}>
            Retire sua senha sem sair de casa!
          </h1>
          <p style={{ fontSize: "15px", color: T.muted, lineHeight: 1.6, margin: "0 0 28px", maxWidth: "420px" }}>
            Pegue sua senha na hora! Se preferir, entre com sua conta para acompanhar seu histórico.
          </p>
          <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
            <Btn variant="primary" onClick={() => { setMsg(null); setModalAberto(true); }} disabled={loading}>
              Retirar minha senha
            </Btn>
            <Btn variant="outline" onClick={() => { window.location.href = "/telao"; }}>
              Ver painel ao vivo
            </Btn>
          </div>
          <p style={{ fontSize: "12px", color: T.muted, margin: 0 }}>ⓘ Retirar senha sem login de forma rápida</p>

          {ticketVisitante && (
            <Card style={{ marginTop: "28px", borderLeft: `4px solid ${T.accent}`, maxWidth: "420px" }}>
              <Label>Sua senha de visitante</Label>
              <p style={{ margin: "0 0 4px", fontSize: "32px", fontWeight: "800", color: T.accent, lineHeight: 1 }}>
                {ticketVisitante.numero}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: T.muted }}>
                Código {ticketVisitante.codigoAcesso} · acompanhe no{" "}
                <a href="/telao" style={{ color: T.accent, fontWeight: "600" }}>painel ao vivo</a>
              </p>
            </Card>
          )}

          {msg && <div style={{ marginTop: "20px", maxWidth: "420px" }}><Toast msg={msg} /></div>}
        </div>

        {/* CARD LOGIN / CADASTRO */}
        <Card style={{ position: "relative", overflow: "visible" }}>
          <span style={{ position: "absolute", top: "-13px", left: "24px", background: T.accent, color: "#fff",
            fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" }}>
            Recomendado
          </span>
          <h3 style={{ margin: "8px 0 20px", fontSize: "17px", fontWeight: "700", color: T.text }}>
            {modo === "login" ? "Entrar com sua conta" : "Criar sua conta"}
          </h3>

          {modo === "cadastro" && (
            <div style={{ marginBottom: "14px" }}>
              <Label>Nome</Label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                style={inputStyle} placeholder="Seu nome" />
            </div>
          )}

          <div style={{ marginBottom: "14px" }}>
            <Label>E-mail *</Label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              style={inputStyle} placeholder="voce@email.com" />
          </div>

          <div style={{ marginBottom: modo === "login" ? "8px" : "18px" }}>
            <Label>Senha *</Label>
            <input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })}
              style={inputStyle} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && entrarOuCadastrar()} />
          </div>

          {modo === "login" && (
            <p style={{ margin: "0 0 18px", fontSize: "12px" }}>
              <a href="#" onClick={e => {
                e.preventDefault();
                setMsg({ text: "A recuperação de senha ainda não está disponível.", type: "error" });
              }} style={{ color: T.accent, textDecoration: "none", fontWeight: "600" }}>
                Esqueceu a senha?
              </a>
            </p>
          )}

          <Btn variant="primary" full onClick={entrarOuCadastrar} disabled={loading || !form.email || !form.senha}>
            {loading ? "Aguarde..." : modo === "login" ? "Acessar conta" : "Criar conta"}
          </Btn>

          <Divider />

          <p style={{ textAlign: "center", fontSize: "12px", color: T.muted, margin: "0 0 12px" }}>Ou entrar com</p>
          <div style={{ display: "grid", gridTemplateColumns: modo === "login" ? "1fr 1fr" : "1fr", gap: "10px" }}>
            <Btn variant="google" onClick={onGoogle}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <GoogleIcon size={16} /> Google
              </span>
            </Btn>
            {modo === "login" && (
              <Btn variant="outline" onClick={() => { setModo("cadastro"); setMsg(null); }}>Criar conta</Btn>
            )}
          </div>

          {modo === "cadastro" && (
            <p style={{ textAlign: "center", fontSize: "12px", color: T.muted, marginTop: "16px" }}>
              Já tem conta?{" "}
              <a href="#" onClick={e => { e.preventDefault(); setModo("login"); setMsg(null); }}
                style={{ color: T.accent, fontWeight: "600", textDecoration: "none" }}>
                Entrar
              </a>
            </p>
          )}
        </Card>
        </div>
      </div>

      {/* INFO: visitante vs conta */}
      <div id="como-funciona" style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: "48px 24px" }}>
        <div className="rs-info-grid" style={{ maxWidth: "1080px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <Card>
            <h4 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: "700", color: T.text }}>
              Retirar como visitante
            </h4>
            <ul style={{ margin: 0, paddingLeft: "18px", color: T.muted, fontSize: "13px", lineHeight: 1.9 }}>
              <li>Gera uma senha na hora</li>
              <li>Acompanhe pelo número</li>
              <li>Sem login</li>
            </ul>
          </Card>
          <Card>
            <h4 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: "700", color: T.text }}>
              Retirar com Conta/Google
            </h4>
            <ul style={{ margin: 0, paddingLeft: "18px", color: T.muted, fontSize: "13px", lineHeight: 1.9 }}>
              <li>Sua senha fica salva na conta</li>
              <li>Veja histórico e prioridades</li>
            </ul>
          </Card>
        </div>
      </div>

      <p style={{ textAlign: "center", color: T.muted, fontSize: "12px", padding: "20px", margin: 0 }}>
        Retirada de Senhas · Sistema de atendimento online {" "}
      </p>

      {modalAberto && (
        <ModalTipoVisitante
          onClose={() => setModalAberto(false)}
          onConfirmar={retirarComoVisitante}
          loading={loading}
        />
      )}
    </div>
  );
}

/* ── PAINEL DO CLIENTE ── */
function PainelCliente({ token, onLogout }) {
  const [tela, setTela] = useState("inicio");
  const [minhaSenha, setMinhaSenha] = useState(null);
  const [tipo, setTipo] = useState("normal");
  const [filaPublica, setFilaPublica] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const buscarMinha = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/minha-senha`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMinhaSenha(data?.numero ? data : null);
    } catch {}
  }, [token]);

  const buscarFila = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/fila`);
      const data = await res.json();
      setFilaPublica(data);
    } catch {}
  }, []);

  useEffect(() => {
    buscarMinha();
    const socket = io(API);
    socket.on("filaAtualizada", () => { buscarMinha(); buscarFila(); });
    socket.on("senhaChamada",   () => { buscarMinha(); buscarFila(); });
    return () => socket.disconnect();
  }, [buscarMinha, buscarFila]);

  useEffect(() => {
    if (tela === "fila")  buscarFila();
    if (tela === "minha") buscarMinha();
  }, [tela, buscarFila, buscarMinha]);

  const retirar = async () => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || data.mensagem);
      setMsg({ text: `Senha ${data.numero} retirada com sucesso!`, type: "ok" });
      buscarMinha();
      setTimeout(() => setTela("minha"), 1000);
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  };

  const cancelar = async () => {
    if (!window.confirm("Deseja cancelar sua senha?")) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/minha-senha/cancelar`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` },
      });
      setMinhaSenha(null);
      setMsg({ text: "Senha cancelada.", type: "ok" });
      setTela("inicio");
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  };

  const navItems = [
    { id: "inicio",  label: "Início"        },
    { id: "retirar", label: "Retirar Senha" },
    { id: "minha",   label: "Minha Senha"   },
    { id: "fila",    label: "Ver Fila"      },
  ];

  const layout = (title, children) => (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      {/* Topbar */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: "56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🎫</span>
          <span style={{ fontWeight: "700", fontSize: "15px", color: T.text }}>Sistema de Senhas</span>
        </div>
        <Btn variant="ghost" small onClick={onLogout}>Sair</Btn>
      </div>

      {/* Nav */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`,
        display: "flex", padding: "0 24px", overflowX: "auto" }}>
        {navItems.map(t => (
          <button key={t.id} onClick={() => setTela(t.id)} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: T.font,
            fontSize: "13px", fontWeight: tela === t.id ? "700" : "400",
            color: tela === t.id ? T.accent : T.muted,
            padding: "16px 16px 14px",
            borderBottom: tela === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: T.text, margin: "0 0 24px" }}>{title}</h2>
        {msg && <Toast msg={msg} />}
        {children}
      </div>
    </div>
  );

  /* Início */
  if (tela === "inicio") return layout("Bem-vindo",
    <div style={{ display: "grid", gap: "16px" }}>
      {minhaSenha && (
        <Card style={{ borderLeft: `4px solid ${T.accent}` }}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: T.muted, fontWeight: "600" }}>SENHA ATIVA</p>
          <p style={{ margin: "0 0 8px", fontSize: "40px", fontWeight: "800", color: T.accent, lineHeight: 1 }}>
            {minhaSenha.numero}
          </p>
          <Badge status={minhaSenha.status} />
          {minhaSenha.pessoasNaFrente > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: T.muted }}>
              {minhaSenha.pessoasNaFrente} pessoa(s) na sua frente · ~{minhaSenha.tempoEstimadoMinutos} min
            </p>
          )}
          {minhaSenha.status === "chamando" && (
            <p style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: "700", color: T.accent }}>
              ⚡ É a sua vez! Dirija-se ao atendimento.
            </p>
          )}
        </Card>
      )}

      {[
        { id: "retirar", icon: "🎟️", label: "Retirar nova senha",  desc: "Normal ou prioritária"      },
        { id: "minha",   icon: "📋", label: "Minha senha",          desc: "Ver posição e status"       },
        { id: "fila",    icon: "👥", label: "Ver fila completa",    desc: "Todas as senhas aguardando" },
      ].map(item => (
        <Card key={item.id} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}
          onClick={() => setTela(item.id)}>
          <span style={{ fontSize: "28px" }}>{item.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 2px", fontWeight: "600", fontSize: "15px", color: T.text }}>{item.label}</p>
            <p style={{ margin: 0, fontSize: "12px", color: T.muted }}>{item.desc}</p>
          </div>
          <span style={{ color: T.muted, fontSize: "18px" }}>›</span>
        </Card>
      ))}
    </div>
  );

  /* Retirar */
  if (tela === "retirar") return layout("Retirar Senha",
    <Card>
      {minhaSenha ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>⚠️</p>
          <p style={{ fontWeight: "600", color: T.text, margin: "0 0 6px" }}>
            Você já possui a senha <strong style={{ color: T.accent }}>{minhaSenha.numero}</strong> ativa.
          </p>
          <p style={{ color: T.muted, fontSize: "13px", marginBottom: "24px" }}>
            Cancele sua senha atual antes de retirar uma nova.
          </p>
          <Btn variant="danger" onClick={cancelar} disabled={loading}>Cancelar minha senha</Btn>
        </div>
      ) : (
        <>
          <Label>Tipo de atendimento</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            {[
              { v: "normal",      icon: "🏷️", label: "Normal",      desc: "Atendimento padrão"    },
              { v: "prioritario", icon: "⭐", label: "Prioritário", desc: "Gestantes, idosos, PCD" },
            ].map(t => (
              <div key={t.v} onClick={() => setTipo(t.v)} style={{
                padding: "16px", borderRadius: "8px", cursor: "pointer",
                border: `2px solid ${tipo === t.v ? T.accent : T.border}`,
                background: tipo === t.v ? T.accentLt : T.surface, transition: "all 0.15s",
              }}>
                <p style={{ margin: "0 0 4px", fontSize: "22px" }}>{t.icon}</p>
                <p style={{ margin: "0 0 2px", fontWeight: "600", fontSize: "14px",
                  color: tipo === t.v ? T.accent : T.text }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: "11px", color: T.muted }}>{t.desc}</p>
              </div>
            ))}
          </div>
          <Btn variant="primary" full onClick={retirar} disabled={loading}>
            {loading ? "Retirando..." : "Confirmar e retirar senha"}
          </Btn>
        </>
      )}
    </Card>
  );

  /* Minha senha */
  if (tela === "minha") return layout("Minha Senha",
    <Card>
      {!minhaSenha ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🎫</p>
          <p style={{ color: T.muted, margin: "0 0 24px" }}>Você não possui senha ativa.</p>
          <Btn variant="primary" onClick={() => setTela("retirar")}>Retirar senha</Btn>
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "12px", color: T.muted, fontWeight: "600",
              letterSpacing: "0.08em", textTransform: "uppercase" }}>Sua senha</p>
            <p style={{ margin: "0 0 12px", fontSize: "80px", fontWeight: "800",
              color: T.accent, lineHeight: 1 }}>{minhaSenha.numero}</p>
            <Badge status={minhaSenha.status} />
          </div>

          {minhaSenha.status === "esperando" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "20px 0" }}>
              {[
                { num: minhaSenha.pessoasNaFrente ?? "—",                              label: "Na sua frente"   },
                { num: minhaSenha.tempoEstimadoMinutos != null ? `~${minhaSenha.tempoEstimadoMinutos}min` : "—", label: "Tempo estimado" },
              ].map(s => (
                <div key={s.label} style={{ background: T.bg, borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "28px", fontWeight: "700", color: T.text }}>{s.num}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: T.muted }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {minhaSenha.status === "chamando" && (
            <div style={{ background: T.accentLt, borderRadius: "8px", padding: "16px",
              textAlign: "center", margin: "20px 0" }}>
              <p style={{ margin: 0, fontWeight: "700", color: T.accent, fontSize: "15px" }}>
                ⚡ É a sua vez! Dirija-se ao atendimento.
              </p>
            </div>
          )}

          {minhaSenha.status !== "chamando" && minhaSenha.status !== "atendido" && (
            <Btn variant="danger" full onClick={cancelar} disabled={loading}>Cancelar minha senha</Btn>
          )}
        </>
      )}
    </Card>
  );

  /* Fila */
  if (tela === "fila") return layout("Fila de Atendimento",
    <>
      {!filaPublica ? (
        <Card><p style={{ color: T.muted, textAlign: "center" }}>Carregando...</p></Card>
      ) : (
        <>
          {filaPublica.chamando && (
            <Card style={{ borderLeft: `4px solid ${T.accent}`, marginBottom: "16px" }}>
              <Label>Em atendimento agora</Label>
              <p style={{ margin: "0 0 4px", fontSize: "40px", fontWeight: "800", color: T.accent, lineHeight: 1 }}>
                {filaPublica.chamando.numero}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: T.muted }}>
                {filaPublica.chamando.tipo === "prioritario" ? "⭐ Prioritário" : "Normal"}
              </p>
            </Card>
          )}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <Label>Na fila de espera</Label>
              <span style={{ fontSize: "13px", fontWeight: "600", color: T.accent }}>
                {filaPublica.totalNaFila} pessoa(s)
              </span>
            </div>
            {filaPublica.fila?.length === 0 ? (
              <p style={{ color: T.muted, fontSize: "14px", textAlign: "center", padding: "24px 0" }}>Fila vazia</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filaPublica.fila?.map((s, i) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "8px",
                    background: T.bg, border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: T.muted, width: "20px", fontWeight: "600" }}>#{i + 1}</span>
                      <span style={{ fontWeight: "700", fontSize: "16px", color: T.text }}>{s.numero}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {s.tipo === "prioritario" ? "⭐ Prior." : "Normal"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );

  return null;
}

/* ── EXPORT PRINCIPAL ── */
export default function ClientePage() {
  injectFont();
  const [token, setToken] = useState(() => localStorage.getItem("cliente_token") || null);

  /* Capturar token do redirect Google */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tk = p.get("token");
    if (tk) {
      localStorage.setItem("cliente_token", tk);
      setToken(tk);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  if (!token) return (
    <LandingCliente
      onGoogle={() => { window.location.href = `${API}/auth/google`; }}
      onLoginSuccess={(tk) => { localStorage.setItem("cliente_token", tk); setToken(tk); }}
    />
  );

  return (
    <PainelCliente
      token={token}
      onLogout={() => { localStorage.removeItem("cliente_token"); setToken(null); }}
    />
  );
}