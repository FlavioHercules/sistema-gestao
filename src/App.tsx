import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";

// Páginas da Secretaria
import { SecretariaDashboard } from "./pages/secretaria/SecretariaDashboard";
import { AlunosPage } from "./pages/secretaria/AlunosPage";
import { ListaTurmas } from "./pages/secretaria/ListaTurmas";

// Páginas da Coordenação
import { CoordenacaoDashboardPage } from "./pages/coordenacao/DashboardPage";
import { CoordenacaoProfessoresPage } from "./pages/coordenacao/ProfessoresPage";
import { CoordenacaoDisciplinasPage } from "./pages/coordenacao/DisciplinasPage";
import { CoordenacaoTurmasPage } from "./pages/coordenacao/TurmasPage";
import { CoordenacaoAssociacoesPage } from "./pages/coordenacao/AssociacoesPage";
import { UsuariosPage } from "./pages/coordenacao/UsuariosPage";
import { CoordenacaoHorariosPage } from "./pages/coordenacao/HorariosPage";
import { CoordenacaoAvisosPage } from "./pages/coordenacao/AvisosPage";

// Páginas do Professor
import { ProfessorDashboard } from "./pages/professor/ProfessorDashboard";
import { ProfessorTurmas } from "./pages/professor/ProfessorTurmas";
import { ProfessorNotas } from "./pages/professor/ProfessorNotas";
import { ProfessorBoletim } from "./pages/professor/ProfessorBoletim";
import { ProfessorAtividades } from "./pages/professor/ProfessorAtividades";

// Páginas do Aluno (Corrigido com alias para manter a compatibilidade da tag <AlunoHorarios />)
import { AlunoHorariosPage as AlunoHorarios } from "./pages/aluno/AlunoHorarios";
import { AlunoDashboard } from "./pages/aluno/AlunoDashboard";
import { AlunoBoletim } from "./pages/aluno/AlunoBoletim";
import { AlunoAtividades } from "./pages/aluno/AlunoAtividades";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* ROTAS DA SECRETARIA */}
          <Route
            path="/secretaria"
            element={
              <ProtectedRoute roles={["secretaria"]}>
                <SecretariaDashboard />
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
                <ListaTurmas />
              </ProtectedRoute>
            }
          />

          {/* ROTAS DA COORDENAÇÃO */}
          <Route
            path="/coordenacao"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/professores"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoProfessoresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/disciplinas"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoDisciplinasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/turmas"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoTurmasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/associacoes"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoAssociacoesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/usuarios"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/horarios"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoHorariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordenacao/avisos"
            element={
              <ProtectedRoute roles={["coordenacao", "secretaria"]}>
                <CoordenacaoAvisosPage />
              </ProtectedRoute>
            }
          />

          {/* ROTAS DO PROFESSOR */}
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
            path="/professor/atividades"
            element={
              <ProtectedRoute roles={["professor"]}>
                <ProfessorAtividades />
              </ProtectedRoute>
            }
          />

          {/* ROTAS DO ALUNO */}
          <Route
            path="/aluno"
            element={
              <ProtectedRoute roles={["aluno"]}>
                <AlunoDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aluno/boletim"
            element={
              <ProtectedRoute roles={["aluno"]}>
                <AlunoBoletim />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aluno/horarios"
            element={
              <ProtectedRoute roles={["aluno"]}>
                <AlunoHorarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aluno/atividades"
            element={
              <ProtectedRoute roles={["aluno"]}>
                <AlunoAtividades />
              </ProtectedRoute>
            }
          />

          {/* Rota padrão */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}