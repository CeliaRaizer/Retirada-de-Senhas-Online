/**
 * pages/RedefinirSenhaPage.jsx
 * Recebe o token de recuperação via querystring (?token=...) e
 * permite definir uma nova senha.
 */
import { useState } from "react";

const API = "http://localhost:3000";

const T = {
  bg: "#f4f6f9", surface: "#ffffff", border: "#e2e6ec", text: "#0d1b2a",
  muted: "#7a8899", accent: "#1b4f8a", accentLt: "#e8f0fb",
  success: "#1a7a4a", successLt: "#e6f4ed", danger: "#b52a2a", dangerLt: "#fdeaea",
  font: "'Sora', sans-serif", radius: "10px", shadow: "0 2px 16px rgba(13,27,42,0.08)",
};

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px",
  border: `1px solid ${T.border}`, fontSize: "14px", fontFamily: T.font, outline: "none",
};

export default function RedefinirSenhaPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [concluido, setConcluido] = useState(false);

  const submeter = async () => {
    setMsg(null);

    if (senha.length < 6) {
      setMsg({ text: "A senha precisa ter pelo menos 6 caracteres.", type: "error" });
      return;
    }
    if (senha !== confirmar) {
      setMsg({ text: "As senhas não coincidem.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/cliente/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || "Não foi possível redefinir a senha");

      setConcluido(true);
      setMsg({ text: data.mensagem, type: "ok" });
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ background: T.surface, borderRadius: T.radius, border: `1px solid ${T.border}`,
          boxShadow: T.shadow, padding: "32px" }}>

          <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: T.text }}>
            Definir nova senha
          </h2>

          {!token && (
            <p style={{ fontSize: "13px", color: T.danger, margin: "12px 0 0" }}>
              Link inválido — falta o token. Solicite a recuperação de senha novamente.
            </p>
          )}

          {token && !concluido && (
            <>
              <p style={{ fontSize: "13px", color: T.muted, margin: "0 0 20px" }}>
                Escolha uma nova senha para sua conta.
              </p>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", color: T.muted,
                  letterSpacing: "0.06em", textTransform: "uppercase" }}>Nova senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  style={{ ...inputStyle, marginTop: "6px" }} placeholder="••••••••"
                  onKeyDown={e => e.key === "Enter" && submeter()} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", color: T.muted,
                  letterSpacing: "0.06em", textTransform: "uppercase" }}>Confirmar senha</label>
                <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  style={{ ...inputStyle, marginTop: "6px" }} placeholder="••••••••"
                  onKeyDown={e => e.key === "Enter" && submeter()} />
              </div>

              {msg && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
                  fontSize: "13px", background: msg.type === "error" ? T.dangerLt : T.successLt,
                  color: msg.type === "error" ? T.danger : T.success }}>
                  {msg.text}
                </div>
              )}

              <button onClick={submeter} disabled={loading || !senha || !confirmar}
                style={{ width: "100%", background: T.accent, color: "#fff", border: "none",
                  borderRadius: "8px", padding: "13px", fontFamily: T.font, fontWeight: "600",
                  fontSize: "14px", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1 }}>
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </>
          )}

          {concluido && (
            <>
              <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
                fontSize: "13px", background: T.successLt, color: T.success }}>
                {msg?.text}
              </div>
              <a href="/" style={{ display: "block", textAlign: "center", color: T.accent,
                fontWeight: "600", fontSize: "14px", textDecoration: "none" }}>
                Ir para a tela de login →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}