import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { TipoUsuario } from "../lib/supabase";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  roles: TipoUsuario[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-sky-400" size={28} />
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (!roles.includes(usuario.tipo_usuario)) {
    const redirectPath: Record<string, string> = {
      secretaria: "/secretaria",
      aluno: "/aluno",
      professor: "/professor",
      coordenacao: "/coordenacao",
    };

    return <Navigate to={redirectPath[usuario.tipo_usuario] ?? "/login"} replace />;
  }

  return <>{children}</>;
}
