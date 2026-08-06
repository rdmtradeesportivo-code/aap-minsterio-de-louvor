import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import ClientesList from "./pages/clientes/ClientesList";
import ClienteDetail from "./pages/clientes/ClienteDetail";
import PecasList from "./pages/estoque/PecasList";
import OsList from "./pages/os/OsList";
import OsDetail from "./pages/os/OsDetail";
import ContasPagar from "./pages/financeiro/ContasPagar";
import ContasReceber from "./pages/financeiro/ContasReceber";
import Folha from "./pages/financeiro/Folha";
import OrcadoRealizado from "./pages/financeiro/OrcadoRealizado";
import DashboardFinanceiro from "./pages/financeiro/Dashboard";
import Relatorios from "./pages/relatorios/Relatorios";

// Recepção cadastra/edita clientes; Admin e Financeiro veem tudo.
const PERFIS_CLIENTES = ["admin", "financeiro", "recepcao"];
// Financeiro é restrito inteiramente a admin/financeiro.
const PERFIS_FINANCEIRO = ["admin", "financeiro"];

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute perfis={PERFIS_CLIENTES}>
                <ClientesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/:id"
            element={
              <ProtectedRoute perfis={PERFIS_CLIENTES}>
                <ClienteDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estoque"
            element={
              <ProtectedRoute>
                <PecasList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/os"
            element={
              <ProtectedRoute>
                <OsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/os/:id"
            element={
              <ProtectedRoute>
                <OsDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financeiro/contas-pagar"
            element={
              <ProtectedRoute perfis={PERFIS_FINANCEIRO}>
                <ContasPagar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financeiro/contas-receber"
            element={
              <ProtectedRoute perfis={PERFIS_FINANCEIRO}>
                <ContasReceber />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financeiro/folha"
            element={
              <ProtectedRoute perfis={PERFIS_FINANCEIRO}>
                <Folha />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financeiro/orcado-realizado"
            element={
              <ProtectedRoute perfis={PERFIS_FINANCEIRO}>
                <OrcadoRealizado />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financeiro/dashboard"
            element={
              <ProtectedRoute perfis={PERFIS_FINANCEIRO}>
                <DashboardFinanceiro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute perfis={PERFIS_FINANCEIRO}>
                <Relatorios />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
