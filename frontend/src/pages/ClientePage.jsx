/**
 * pages/ClientePage.jsx
 * Tela do cliente — login Google + painel de senha
 */
import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

const API = "http://localhost:3000";
const FRONTEND_URL = "http://localhost:5173";

export const T = {
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

export const injectFont = () => {
  if (document.getElementById("app-font")) return;
  const l = document.createElement("link");
  l.id = "app-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap";
  document.head.appendChild(l);
};

export const Btn = ({ children, variant = "primary", onClick, disabled, full, small }) => {
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

export const Card = ({ children, style, ...rest }) => (
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

export const Toast = ({ msg }) => {
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

/* ── helpers de identidade (iniciais e leitura do nome no token) ── */
function getIniciais(nome) {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0].slice(0, 2);
  return letras.toUpperCase();
}

/* Lê o payload de um JWT só para exibir dados (ex.: nome) na interface —
   não substitui a validação real, que é sempre feita no backend. */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json);
  } catch { return null; }
}

/* ── NAV — usada nas telas de fluxo (tipo de atendimento) ── */
export function NavFluxo({ nome, foto, painelHref = "/telao" }) {
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        <span style={{ fontWeight: "800", fontSize: "16px", color: T.text }}>Retirada de Senhas</span>
        <a href={painelHref} style={{ color: T.muted, fontSize: "14px", textDecoration: "none" }}>Painel</a>
      </div>
      {nome ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {foto ? (
            <img src={foto} alt={nome} referrerPolicy="no-referrer" style={{ width: "28px", height: "28px",
              borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${T.border}` }} />
          ) : (
            <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: T.accent,
              color: "#fff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0 }}>{getIniciais(nome)}</span>
          )}
          <span style={{ fontSize: "13px", fontWeight: "600", color: T.text }}>{nome}</span>
        </div>
      ) : (
        <span style={{ display: "flex", alignItems: "center", gap: "6px", background: T.accentLt,
          color: T.accent, fontSize: "12px", fontWeight: "700", padding: "6px 12px", borderRadius: "20px" }}>
          👤 Visitante
        </span>
      )}
    </div>
  );
}

/* ── TELA CHEIA: escolher tipo de atendimento ── */
function TelaTipoAtendimento({ nome, foto, onVoltar, onConfirmar, loading, msg, mostrarLoginLink, onIrParaLogin }) {
  const [tipo, setTipo] = useState("normal");
  const opcoes = [
    { v: "normal",      icon: "👤", label: "Atendimento normal",     desc: "Fila padrão"              },
    { v: "prioritario", icon: "⭐", label: "Atendimento prioritário", desc: "Idosos, gestantes, PCD"   },
  ];
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <NavFluxo nome={nome} foto={foto} />
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "48px 24px" }}>
        {nome && (
          <h2 style={{ fontSize: "26px", fontWeight: "700", color: T.muted, margin: "0 0 20px" }}>
            Bem-Vindo(a) <span style={{ color: T.accent }}>{nome.split(" ")[0]}!</span>
          </h2>
        )}

        {onVoltar && (
          <a href="#" onClick={e => { e.preventDefault(); onVoltar(); }}
            style={{ display: "inline-block", color: T.muted, fontSize: "14px", textDecoration: "none", marginBottom: "20px" }}>
            ← Voltar
          </a>
        )}

        <h1 style={{ fontSize: "30px", fontWeight: "800", color: T.text, margin: "0 0 6px" }}>
          Qual o tipo de atendimento?
        </h1>
        <p style={{ fontSize: "14px", color: T.muted, margin: "0 0 28px" }}>
          Escolha a opção que se aplica a você agora
        </p>

        {msg && <div style={{ marginBottom: "20px" }}><Toast msg={msg} /></div>}

        <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
          {opcoes.map(o => {
            const ativo = tipo === o.v;
            return (
              <div key={o.v} onClick={() => setTipo(o.v)} role="radio" aria-checked={ativo} tabIndex={0}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && setTipo(o.v)}
                style={{
                  display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px",
                  borderRadius: "12px", cursor: "pointer",
                  border: `1.5px solid ${ativo ? T.accent : T.border}`,
                  background: ativo ? T.accentLt : T.surface, transition: "all 0.15s",
                }}>
                <span style={{ width: "44px", height: "44px", borderRadius: "10px", flexShrink: 0,
                  background: o.v === "prioritario" ? T.warnLt : T.surface,
                  border: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                  {o.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: "700", fontSize: "15px", color: T.text }}>{o.label}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: T.muted }}>{o.desc}</p>
                </div>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${ativo ? T.accent : "#c7ccd4"}`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ativo && <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.accent }} />}
                </span>
              </div>
            );
          })}
        </div>

        <Btn variant="primary" full onClick={() => onConfirmar(tipo)} disabled={loading}>
          {loading ? "Retirando..." : "Retirar senha →"}
        </Btn>

        {mostrarLoginLink && (
          <p style={{ textAlign: "center", fontSize: "13px", color: T.muted, marginTop: "18px" }}>
            Sem login?{" "}
            <a href="#" onClick={e => { e.preventDefault(); onIrParaLogin(); }}
              style={{ color: T.accent, fontWeight: "600", textDecoration: "none" }}>
              Entrar com conta
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

/* ── CARD: senha ativa (QR code, copiar link, ver painel, cancelar) ──
   Compartilhado entre visitante e cliente logado. */
export function CardMinhaSenha({ senha, onCancelar, loading, historico }) {
  const linkAcompanhar = senha.codigoAcesso
    ? `${FRONTEND_URL}/acompanhar?numero=${encodeURIComponent(senha.numero)}&codigo=${encodeURIComponent(senha.codigoAcesso)}`
    : null;

  const [copiado, setCopiado] = useState(false);
  const copiarLink = async () => {
    if (!linkAcompanhar) return;
    try {
      await navigator.clipboard.writeText(linkAcompanhar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  const ehPrioritario = senha.tipo === "prioritario";
  const corTipo = ehPrioritario ? T.warn : T.accent;
  const corTipoBg = ehPrioritario ? T.warnLt : T.accentLt;

  return (
    <>
      <Card>
        <div style={{ textAlign: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: corTipoBg,
            color: corTipo, fontSize: "12px", fontWeight: "700", padding: "5px 14px", borderRadius: "20px",
            marginBottom: "16px" }}>
            {ehPrioritario ? "⭐" : "👤"} {ehPrioritario ? "PRIORITÁRIO" : "NORMAL"}
          </span>

          <p style={{ margin: "0 0 4px", fontSize: "12px", color: T.muted, fontWeight: "600",
            letterSpacing: "0.08em", textTransform: "uppercase" }}>Sua senha</p>
          <p style={{ margin: "0 0 16px", fontSize: "64px", fontWeight: "800", color: corTipo, lineHeight: 1 }}>
            {senha.numero}
          </p>

          {senha.status === "esperando" && (
            <>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: T.successLt,
                color: T.success, fontSize: "13px", fontWeight: "700", padding: "6px 14px", borderRadius: "20px",
                marginBottom: "10px" }}>
                👥 {senha.pessoasNaFrente ?? "—"} pessoas na sua frente
              </span>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: T.muted }}>
                Tempo estimado: ~{senha.tempoEstimadoMinutos ?? "—"} min
              </p>
            </>
          )}

          {senha.status === "chamando" && (
            <div style={{ background: T.accentLt, borderRadius: "8px", padding: "14px", margin: "0 0 20px" }}>
              <p style={{ margin: 0, fontWeight: "700", color: T.accent, fontSize: "14px" }}>
                ⚡ É a sua vez! Dirija-se ao atendimento.
              </p>
            </div>
          )}

          {linkAcompanhar && (
            <div style={{ display: "flex", justifyContent: "center", gap: "28px", alignItems: "flex-start",
              margin: "12px 0 8px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "100px", height: "100px", border: `1px solid ${T.border}`, borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                  <QRCodeSVG value={linkAcompanhar} size={80} fgColor={T.text} bgColor={T.surface} />
                </div>
                <button onClick={copiarLink} style={{ display: "block", margin: "8px auto 0", background: "none",
                  border: "none", cursor: "pointer", color: T.accent, fontSize: "12px", fontWeight: "600",
                  textDecoration: "none" }}>
                  {copiado ? "Link copiado!" : "🔗 Copiar link"}
                </button>
              </div>
              <div style={{ textAlign: "center" }}>
                <a href="/telao" style={{ display: "flex", width: "100px", height: "100px", alignItems: "center",
                  justifyContent: "center", border: `1px solid ${T.border}`, borderRadius: "8px",
                  color: T.muted, textDecoration: "none", fontSize: "28px", boxSizing: "border-box" }}>
                  📺
                </a>
                <a href="/telao" style={{ display: "block", marginTop: "8px", color: T.accent, fontSize: "12px",
                  fontWeight: "600", textDecoration: "none" }}>
                  Ver painel
                </a>
              </div>
            </div>
          )}
        </div>

        {senha.status !== "chamando" && senha.status !== "atendido" && (
          <Btn variant="primary" full onClick={onCancelar} disabled={loading} style={{ marginTop: "16px" }}>
            Cancelar Senha
          </Btn>
        )}
      </Card>

      {historico && historico.length > 0 && (
        <Card style={{ marginTop: "20px" }}>
          <p style={{ margin: "0 0 14px", fontWeight: "700", fontSize: "15px", color: T.text }}>
            Histórico de Atendimento:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {historico.map(h => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "16px", color: h.tipo === "prioritario" ? T.warn : T.muted }}>
                  {h.tipo === "prioritario" ? "⭐" : "👤"}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: "600", fontSize: "13px", color: T.text }}>
                    {h.tipo === "prioritario" ? "Preferencial" : "Normal"}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: T.muted }}>
                    {new Date(h.data).toLocaleDateString("pt-BR")} · Senha: {h.numero}
                  </p>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px",
                  background: h.status === "atendido" ? T.successLt : "#eef0f3",
                  color: h.status === "atendido" ? T.success : T.muted,
                }}>
                  {h.status === "atendido" ? "Atendido" : "Cancelado"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

/* ── LANDING PAGE ── */
function LandingCliente({ onGoogle, onLoginSuccess, avisoInicial }) {
  const [modo, setModo] = useState("login"); // "login" | "cadastro" | "recuperar"
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [precisaVerificar, setPrecisaVerificar] = useState(false);
  const [telaTipoAberta, setTelaTipoAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [telaTicket, setTelaTicket] = useState(false);
  const [ticketDados, setTicketDados] = useState(null);
  const [ticketVisitante, setTicketVisitante] = useState(() => {
    try { return JSON.parse(localStorage.getItem("visitante_ticket")) || null; }
    catch { return null; }
  });

  const buscarStatusVisitante = useCallback(async (registro) => {
    if (!registro) return;
    try {
      const res = await fetch(`${API}/api/senha/status?numero=${encodeURIComponent(registro.numero)}&codigo=${encodeURIComponent(registro.codigoAcesso)}`);
      if (!res.ok) return; // senha não existe mais (ex: fila resetada) — mantém tela anterior
      const data = await res.json();
      setTicketDados({ ...data, codigoAcesso: registro.codigoAcesso });
    } catch {}
  }, []);

  // Enquanto a tela do ticket estiver aberta, mantém os dados
  // atualizados em tempo real (posição na fila, chamada, etc.)
  useEffect(() => {
    if (!telaTicket || !ticketVisitante) return;
    buscarStatusVisitante(ticketVisitante);
    const socket = io(API);
    socket.on("filaAtualizada", () => buscarStatusVisitante(ticketVisitante));
    socket.on("senhaChamada", () => buscarStatusVisitante(ticketVisitante));
    return () => socket.disconnect();
  }, [telaTicket, ticketVisitante, buscarStatusVisitante]);

  useEffect(() => {
    if (avisoInicial) setMsg(avisoInicial);
  }, [avisoInicial]);

  const salvarTicketVisitante = (senha) => {
    const registro = { numero: senha.numero, codigoAcesso: senha.codigoAcesso };
    localStorage.setItem("visitante_ticket", JSON.stringify(registro));
    setTicketVisitante(registro);
  };

  const entrarOuCadastrar = async () => {
    setLoading(true); setMsg(null); setPrecisaVerificar(false);
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

      if (!res.ok) {
        if (data.emailNaoVerificado) setPrecisaVerificar(true);
        throw new Error(data.mensagem || "Não foi possível continuar");
      }

      if (modo === "cadastro") {
        // Cadastro não faz login automático — a conta só funciona
        // depois de confirmar o email.
        setModo("login");
        setForm(f => ({ ...f, senha: "" }));
        setMsg({ text: data.mensagem, type: "ok" });
      } else {
        onLoginSuccess(data.token);
      }
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const reenviarVerificacao = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/cliente/reenviar-verificacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setMsg({ text: data.mensagem, type: "ok" });
      setPrecisaVerificar(false);
    } catch {
      setMsg({ text: "Não foi possível reenviar agora. Tente novamente.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const solicitarRecuperacao = async () => {
    if (!form.email) {
      setMsg({ text: "Informe seu email primeiro.", type: "error" });
      return;
    }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`${API}/auth/cliente/recuperar-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setMsg({ text: data.mensagem, type: "ok" });
    } catch {
      setMsg({ text: "Não foi possível enviar agora. Tente novamente.", type: "error" });
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
        await buscarStatusVisitante({ numero: data.senha.numero, codigoAcesso: data.senha.codigoAcesso });
      } else if (!res.ok) {
        throw new Error(data.erro || data.mensagem || "Não foi possível retirar a senha");
      } else {
        salvarTicketVisitante(data);
        await buscarStatusVisitante({ numero: data.numero, codigoAcesso: data.codigoAcesso });
      }
      setTelaTipoAberta(false);
      setTelaTicket(true);
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const cancelarComoVisitante = async () => {
    if (!window.confirm("Deseja cancelar sua senha?")) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/senha/anonima/cancelar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: ticketVisitante.numero, codigo: ticketVisitante.codigoAcesso }),
      });
      localStorage.removeItem("visitante_ticket");
      setTicketVisitante(null);
      setTicketDados(null);
      setTelaTicket(false);
      setMsg({ text: "Senha cancelada.", type: "ok" });
    } catch {
      setMsg({ text: "Não foi possível cancelar agora. Tente novamente.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (telaTipoAberta) return (
    <TelaTipoAtendimento
      onVoltar={() => setTelaTipoAberta(false)}
      onConfirmar={retirarComoVisitante}
      loading={loading}
      msg={msg}
      mostrarLoginLink
      onIrParaLogin={() => setTelaTipoAberta(false)}
    />
  );

  if (telaTicket && ticketDados) return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <NavFluxo />
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px" }}>
        <a href="#" onClick={e => { e.preventDefault(); setTelaTicket(false); }} style={{
          display: "inline-flex", alignItems: "center", gap: "6px", color: T.muted,
          fontSize: "13px", textDecoration: "none", marginBottom: "20px" }}>
          ← Voltar
        </a>
        {msg && <div style={{ marginBottom: "16px" }}><Toast msg={msg} /></div>}
        <CardMinhaSenha senha={ticketDados} onCancelar={cancelarComoVisitante} loading={loading} />
      </div>
    </div>
  );

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
            <Btn variant="primary" onClick={() => { setMsg(null); setTelaTipoAberta(true); }} disabled={loading}>
              Retirar minha senha
            </Btn>
            <Btn variant="outline" onClick={() => { window.location.href = "/telao"; }}>
              Ver painel ao vivo
            </Btn>
          </div>
          <p style={{ fontSize: "12px", color: T.muted, margin: 0 }}>ⓘ Retirar senha sem login de forma rápida</p>

          {ticketVisitante && (
            <Card
              onClick={async () => {
                await buscarStatusVisitante(ticketVisitante);
                setTelaTicket(true);
              }}
              style={{ marginTop: "28px", borderLeft: `4px solid ${T.accent}`, maxWidth: "420px", cursor: "pointer" }}
            >
              <Label>Sua senha de visitante</Label>
              <p style={{ margin: "0 0 4px", fontSize: "32px", fontWeight: "800", color: T.accent, lineHeight: 1 }}>
                {ticketVisitante.numero}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: T.accent, fontWeight: "600" }}>
                Ver detalhes e QR code →
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
            {modo === "login" ? "Entrar com sua conta" : modo === "cadastro" ? "Criar sua conta" : "Recuperar senha"}
          </h3>

          {modo === "recuperar" && (
            <p style={{ fontSize: "13px", color: T.muted, margin: "0 0 18px" }}>
              Informe o email da sua conta — se ela existir, enviamos um link pra você definir uma nova senha.
            </p>
          )}

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
              style={inputStyle} placeholder="voce@email.com"
              onKeyDown={e => e.key === "Enter" && (modo === "recuperar" ? solicitarRecuperacao() : entrarOuCadastrar())} />
          </div>

          {modo !== "recuperar" && (
            <div style={{ marginBottom: modo === "login" ? "8px" : "18px" }}>
              <Label>Senha *</Label>
              <input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })}
                style={inputStyle} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && entrarOuCadastrar()} />
            </div>
          )}

          {modo === "login" && (
            <p style={{ margin: "0 0 18px", fontSize: "12px" }}>
              <a href="#" onClick={e => {
                e.preventDefault();
                setModo("recuperar"); setMsg(null); setPrecisaVerificar(false);
              }} style={{ color: T.accent, textDecoration: "none", fontWeight: "600" }}>
                Esqueceu a senha?
              </a>
            </p>
          )}

          {precisaVerificar && (
            <div style={{ background: T.accentLt, borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: T.text }}>
                Sua conta ainda não confirmou o email.
              </p>
              <button onClick={reenviarVerificacao} disabled={loading} style={{
                background: "none", border: "none", padding: 0, color: T.accent,
                fontWeight: "700", fontSize: "12px", cursor: "pointer", textDecoration: "underline",
              }}>
                Reenviar email de verificação
              </button>
            </div>
          )}

          <Btn
            variant="primary"
            full
            onClick={modo === "recuperar" ? solicitarRecuperacao : entrarOuCadastrar}
            disabled={loading || !form.email || (modo !== "recuperar" && !form.senha)}
          >
            {loading
              ? "Aguarde..."
              : modo === "login" ? "Acessar conta"
              : modo === "cadastro" ? "Criar conta"
              : "Enviar link de recuperação"}
          </Btn>

          {modo === "recuperar" && (
            <p style={{ textAlign: "center", fontSize: "12px", color: T.muted, marginTop: "14px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setModo("login"); setMsg(null); }}
                style={{ color: T.accent, fontWeight: "600", textDecoration: "none" }}>
                ← Voltar para o login
              </a>
            </p>
          )}

          {modo !== "recuperar" && (
            <>
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
            </>
          )}

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
        Retirada de Senhas · Sistema de atendimento online ·{" "}
        <a href="/admin" style={{ color: T.muted }}>painel admin</a>
      </p>
    </div>
  );
}

/* ── PAINEL DO CLIENTE ── */
function PainelCliente({ token, onLogout }) {
  const [tela, setTela] = useState("retirar");
  const [minhaSenha, setMinhaSenha] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [filaPublica, setFilaPublica] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const payload = decodeJwtPayload(token);
  const nome = payload?.nome || null;
  const foto = payload?.foto || null;

  const buscarMinha = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/minha-senha`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMinhaSenha(data?.numero ? data : null);
    } catch {}
  }, [token]);

  const buscarHistorico = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/minhas-senhas/historico`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistorico(Array.isArray(data) ? data : []);
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
    if (tela === "minha") { buscarMinha(); buscarHistorico(); }
  }, [tela, buscarFila, buscarMinha, buscarHistorico]);

  useEffect(() => {
    if (tela === "retirar" && minhaSenha) setTela("minha");
  }, [tela, minhaSenha]);

  const retirar = async (tipo) => {
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
      setTela("retirar");
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  };

  const navItems = [
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

  /* Retirar */
  if (tela === "retirar") {
    if (minhaSenha) {
      return null; // o useEffect acima já está redirecionando pra "minha"
    }

    return (
      <TelaTipoAtendimento
        nome={nome}
        foto={foto}
        onVoltar={() => setTela("minha")}
        onConfirmar={retirar}
        loading={loading}
        msg={msg}
      />
    );
  }

  /* Minha senha */
  if (tela === "minha") return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <NavFluxo nome={nome} foto={foto} />
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px" }}>
        <button onClick={onLogout} style={{ display: "block", marginLeft: "auto", marginBottom: "16px",
          background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: "12px",
          textDecoration: "underline" }}>
          Sair
        </button>

        {msg && <div style={{ marginBottom: "16px" }}><Toast msg={msg} /></div>}

        {!minhaSenha ? (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🎫</p>
              <p style={{ color: T.muted, margin: "0 0 24px" }}>Você não possui senha ativa.</p>
              <Btn variant="primary" onClick={() => setTela("retirar")}>Retirar senha</Btn>
            </div>
          </Card>
        ) : (
          <CardMinhaSenha senha={minhaSenha} onCancelar={cancelar} loading={loading} historico={historico} />
        )}
      </div>
    </div>
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
  const [avisoInicial, setAvisoInicial] = useState(null);

  /* Capturar token do redirect Google, ou o resultado do
     link de verificação de email (?emailVerificado=1 / ?erro=...) */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tk = p.get("token");
    const emailVerificado = p.get("emailVerificado");
    const erro = p.get("erro");

    if (tk) {
      localStorage.setItem("cliente_token", tk);
      setToken(tk);
      window.history.replaceState({}, "", "/");
    } else if (emailVerificado) {
      setAvisoInicial({ text: "Email confirmado! Agora você já pode entrar com sua conta.", type: "ok" });
      window.history.replaceState({}, "", "/");
    } else if (erro === "token_invalido") {
      setAvisoInicial({ text: "Link de confirmação inválido ou expirado. Peça um novo abaixo.", type: "error" });
      window.history.replaceState({}, "", "/");
    } else if (erro) {
      setAvisoInicial({ text: "Não foi possível confirmar o email. Tente novamente.", type: "error" });
      window.history.replaceState({}, "", "/");
    }
  }, []);

  if (!token) return (
    <LandingCliente
      onGoogle={() => { window.location.href = `${API}/auth/google`; }}
      onLoginSuccess={(tk) => { localStorage.setItem("cliente_token", tk); setToken(tk); }}
      avisoInicial={avisoInicial}
    />
  );

  return (
    <PainelCliente
      token={token}
      onLogout={() => { localStorage.removeItem("cliente_token"); setToken(null); }}
    />
  );
}