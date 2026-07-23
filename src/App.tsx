import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { SecretariaDashboard } from "./pages/secretaria/SecretariaDashboard";
import { ProfessoresPage } from "./pages/secretaria/ProfessoresPage";
import { AlunosPage } from "./pages/secretaria/AlunosPage";
import { TurmasPage } from "./pages/secretaria/TurmasPage";
import { AssociacoesPage } from "./pages/secretaria/AssociacoesPage";
import { UsuariosPage } from "./pages/secretaria/UsuariosPage";
import { ProfessorDashboard } from "./pages/professor/ProfessorDashboard";
import { ProfessorTurmas } from "./pages/professor/ProfessorTurmas";
import { ProfessorNotas } from "./pages/professor/ProfessorNotas";
import { ProfessorBoletim } from "./pages/professor/ProfessorBoletim";
import { AlunoDashboard } from "./pages/aluno/AlunoDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/secretaria"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <SecretariaDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/secretaria/professores"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <ProfessoresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/secretaria/alunos"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <AlunosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/secretaria/turmas"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <TurmasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/secretaria/associacoes"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <AssociacoesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/secretaria/usuarios"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor"
            element={
              <ProtectedRoute roles={["professor"]}>
                <ProfessorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor/turmas"
            element={
              <ProtectedRoute roles={["professor"]}>
                <ProfessorTurmas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor/notas"
            element={
              <ProtectedRoute roles={["professor"]}>
                <ProfessorNotas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor/boletim"
            element={
              <ProtectedRoute roles={["professor"]}>
                <ProfessorBoletim />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aluno"
            element={
              <ProtectedRoute roles={["aluno"]}>
                <AlunoDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
