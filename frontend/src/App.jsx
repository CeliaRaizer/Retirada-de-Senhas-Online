/**
 * App.jsx — Roteamento principal
 * npm install react-router-dom socket.io-client
 */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClientePage from "./pages/ClientePage";
import AdminPage   from "./pages/AdminPage";
import TelaoPage   from "./pages/TelaoPage";
import RedefinirSenhaPage from "./pages/RedefinirSenhaPage";
import AcompanharPage from "./pages/AcompanharPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<ClientePage />} />
        <Route path="/admin" element={<AdminPage />}   />
        <Route path="/telao" element={<TelaoPage />}   />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        <Route path="/acompanhar" element={<AcompanharPage />} />
      </Routes>
    </BrowserRouter>
  );
}