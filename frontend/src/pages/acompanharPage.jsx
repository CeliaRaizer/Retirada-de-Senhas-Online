/**
 * pages/AcompanharPage.jsx
 * Página pública — acessada via QR code ou link (numero + codigo).
 * Não exige login: qualquer um com o número e o código certos
 * consegue ver o status da senha.
 */
import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { T, Card, Btn, Toast, NavFluxo, CardMinhaSenha, ModalConfirmar, injectFont } from "./ClientePage";

const API = "http://localhost:3000";

export default function AcompanharPage() {
  injectFont();
  const [senha, setSenha] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const numero = params.get("numero");
  const codigo = params.get("codigo");

  const buscarStatus = useCallback(async () => {
    if (!numero || !codigo) {
      setErro("Link inválido — faltam informações da senha.");
      return;
    }
    try {
      const res = await fetch(`${API}/api/senha/status?numero=${encodeURIComponent(numero)}&codigo=${encodeURIComponent(codigo)}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.mensagem || "Senha não encontrada.");
        setSenha(null);
        return;
      }
      setErro(null);
      setSenha({ ...data, codigoAcesso: codigo });
    } catch {
      setErro("Não foi possível consultar agora. Tente novamente.");
    }
  }, [numero, codigo]);

  useEffect(() => {
    buscarStatus();
    const socket = io(API);
    socket.on("filaAtualizada", buscarStatus);
    socket.on("senhaChamada", buscarStatus);
    return () => socket.disconnect();
  }, [buscarStatus]);

  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const cancelar = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/api/senha/anonima/cancelar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, codigo }),
      });
      setMsg({ text: "Senha cancelada.", type: "ok" });
      buscarStatus();
    } catch {
      setMsg({ text: "Não foi possível cancelar agora.", type: "error" });
    } finally {
      setLoading(false);
      setConfirmandoCancelar(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <NavFluxo />
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "800", color: T.text, margin: "0 0 20px" }}>
          Acompanhar senha
        </h1>

        {msg && <div style={{ marginBottom: "16px" }}><Toast msg={msg} /></div>}

        {erro && (
          <Card>
            <p style={{ textAlign: "center", color: T.muted, padding: "24px 0" }}>{erro}</p>
          </Card>
        )}

        {!erro && !senha && (
          <Card><p style={{ textAlign: "center", color: T.muted }}>Carregando...</p></Card>
        )}

        {senha && (
          <CardMinhaSenha senha={senha} onCancelar={() => setConfirmandoCancelar(true)} loading={loading} />
        )}
      </div>

      {confirmandoCancelar && (
        <ModalConfirmar
          titulo="Cancelar senha"
          mensagem={`Tem certeza que deseja cancelar a senha ${numero}? Essa ação não pode ser desfeita.`}
          confirmLabel="Cancelar senha"
          loading={loading}
          onConfirmar={cancelar}
          onCancelar={() => setConfirmandoCancelar(false)}
        />
      )}
    </div>
  );
}