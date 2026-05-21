/**
 * App.jsx — Roteamento principal
 * npm install react-router-dom socket.io-client
 */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClientePage from "./pages/ClientePage";
import AdminPage   from "./pages/AdminPage";
import TelaoPage   from "./pages/TelaoPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<ClientePage />} />
        <Route path="/admin" element={<AdminPage />}   />
        <Route path="/telao" element={<TelaoPage />}   />
      </Routes>
    </BrowserRouter>
  );
}