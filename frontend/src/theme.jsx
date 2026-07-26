/**
 * src/theme.js
 * Tema claro/escuro compartilhado por todas as páginas do sistema.
 *
 * Como funciona: cada página já usa um objeto de tokens `T` (T.bg, T.text,
 * T.accent...) espalhado por centenas de `style={{ ... }}`. Em vez de
 * reescrever tudo isso, os valores de T passam a apontar pra variáveis CSS
 * (ex: "var(--rs-bg)") e este arquivo só troca o VALOR dessas variáveis no
 * <html>. Assim a troca de tema é instantânea e não exige re-render nem
 * tocar em nenhum componente.
 */

import * as React from "react";

export const THEME_KEY = "rs_tema";

const VARS = {
  light: {
    "--rs-bg":         "#f4f6f9",
    "--rs-surface":    "#ffffff",
    "--rs-border":     "#e2e6ec",
    "--rs-text":       "#0d1b2a",
    "--rs-muted":      "#7a8899",
    "--rs-accent":     "#1b4f8a",
    "--rs-accent-lt":  "#e8f0fb",
    "--rs-success":    "#1a7a4a",
    "--rs-success-lt": "#e6f4ed",
    "--rs-danger":     "#b52a2a",
    "--rs-danger-lt":  "#fdeaea",
    "--rs-warn":       "#c47c00",
    "--rs-warn-lt":    "#fff8e6",
    "--rs-shadow":     "0 2px 16px rgba(13,27,42,0.08)",
  },
  dark: {
    "--rs-bg":         "#0a0e14",
    "--rs-surface":    "#131a24",
    "--rs-border":     "#232c3a",
    "--rs-text":       "#eef2f7",
    "--rs-muted":      "#8b98ab",
    "--rs-accent":     "#5b9bef",
    "--rs-accent-lt":  "#1a2c42",
    "--rs-success":    "#4fd18b",
    "--rs-success-lt": "#123527",
    "--rs-danger":     "#e2665f",
    "--rs-danger-lt":  "#3a1e1c",
    "--rs-warn":       "#e0a63a",
    "--rs-warn-lt":    "#382c14",
    "--rs-shadow":     "0 2px 20px rgba(0,0,0,0.5)",
  },
};

export function getTema() {
  try {
    const salvo = localStorage.getItem(THEME_KEY);
    if (salvo === "light" || salvo === "dark") return salvo;
  } catch { /* localStorage indisponível (modo privado, etc.) */ }

  // Sem preferência salva: respeita o tema do sistema operacional
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function aplicarTema(tema) {
  const vars = VARS[tema] || VARS.light;
  const root = document.documentElement;
  Object.entries(vars).forEach(([chave, valor]) => root.style.setProperty(chave, valor));
  root.setAttribute("data-theme", tema);
  root.style.colorScheme = tema;
  try { localStorage.setItem(THEME_KEY, tema); } catch { /* ok ignorar */ }
}

/** Chamar uma vez ao montar cada página (mesmo padrão do injectFont). */
export function initTema() {
  aplicarTema(getTema());
}

/**
 * Hook de tema — usar no topo de cada página.
 * Retorna [tema, alternarTema] e já aplica o tema salvo ao montar.
 *
 *   const [tema, alternarTema] = useTema();
 *   <ThemeToggle tema={tema} onToggle={alternarTema} />
 */
export function useTema() {
  const [tema, setTema] = React.useState(() => {
    initTema();
    return getTema();
  });

  const alternarTema = React.useCallback(() => {
    setTema(atual => {
      const novo = atual === "light" ? "dark" : "light";
      aplicarTema(novo);
      return novo;
    });
  }, []);

  return [tema, alternarTema];
}

/** Botão pronto de alternância de tema — ☀️ / 🌙 */
export function ThemeToggle({ tema, onToggle, dark }) {
  const claro = tema === "light";
  return (
    <button
      onClick={onToggle}
      title={claro ? "Ativar tema escuro" : "Ativar tema claro"}
      aria-label={claro ? "Ativar tema escuro" : "Ativar tema claro"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "34px", height: "34px", borderRadius: "50%", cursor: "pointer",
        fontSize: "15px", lineHeight: 1, flexShrink: 0,
        border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid var(--rs-border)",
        background: dark ? "rgba(255,255,255,0.06)" : "var(--rs-bg)",
        color: dark ? "#cfd6e0" : "var(--rs-muted)",
        transition: "background 0.15s, transform 0.15s",
      }}
    >
      {claro ? "🌙" : "☀️"}
    </button>
  );
}