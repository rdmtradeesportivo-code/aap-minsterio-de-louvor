import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, perfis }) {
  const { user, loading } = useAuth();

  if (loading) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (perfis && !perfis.includes(user.perfil)) {
    return <p style={{ padding: 24 }}>Você não tem permissão para acessar esta página.</p>;
  }

  return children;
}
