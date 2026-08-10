import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { loadProfile } from "../lib/api";

import type {
  Usuario,
  Professor,
  TipoUsuario,
  Aluno,
} from "../lib/supabase";

interface AuthContextValue {
  usuario: Usuario | null;
  professor: Professor | null;
  aluno: Aluno | null;
  session: Session | null;
  loading: boolean;

  signIn: (email: string, senha: string) => Promise<void>;
  loginAluno: (alunoRecord: Aluno) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Carrega o perfil do usuário autenticado.
   *
   * O loadProfile é responsável por buscar:
   * - usuarios
   * - professores_oficial
   * - alunos
   */
  async function applySession(currentSession: Session | null) {
    setSession(currentSession);

    if (!currentSession?.user) {
      setUsuario(null);
      setProfessor(null);
      setAluno(null);
      return;
    }

    try {
      const {
        usuario: usuarioData,
        professor: professorData,
        aluno: alunoData,
      } = await loadProfile(currentSession.user.id);

      setUsuario(usuarioData);
      setProfessor(professorData);
      setAluno(alunoData);
    } catch (error) {
      console.error("Erro ao carregar perfil do usuário:", error);

      setUsuario(null);
      setProfessor(null);
      setAluno(null);
    }
  }

  /**
   * Inicialização da autenticação.
   */
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro ao recuperar sessão:", error);
        }

        if (!mounted) return;

        await applySession(data.session);
      } catch (error) {
        console.error("Erro ao inicializar autenticação:", error);

        if (mounted) {
          setUsuario(null);
          setProfessor(null);
          setAluno(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    /**
     * Escuta alterações na autenticação:
     *
     * - LOGIN
     * - LOGOUT
     * - TOKEN_REFRESHED
     * - USER_UPDATED
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      void (async () => {
        await applySession(newSession);

        if (mounted) {
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login normal:
   * Secretaria / Coordenação / Professor.
   */
  async function signIn(email: string, senha: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Login especial do aluno.
   *
   * O aluno não precisa necessariamente possuir
   * uma sessão do Supabase Auth.
   */
  async function loginAluno(alunoRecord: Aluno): Promise<void> {
    const profileUsuario: Usuario = {
      id: alunoRecord.id,
      nome: alunoRecord.nome,
      email: `${alunoRecord.matricula}@aluno.local`,
      tipo_usuario: "aluno",
      aluno_id: alunoRecord.id,
    };

    setUsuario(profileUsuario);
    setProfessor(null);
    setAluno(alunoRecord);

    // Aluno possui login próprio da aplicação.
    setSession(null);
  }

  /**
   * Logout.
   */
  async function signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } finally {
      setUsuario(null);
      setProfessor(null);
      setAluno(null);
      setSession(null);
    }
  }

  /**
   * Recarrega manualmente os dados do usuário.
   *
   * Útil depois de:
   * - alterar professor
   * - alterar usuário
   * - atualizar dados
   * - vincular professor
   */
  async function refreshProfile(): Promise<void> {
    if (!session?.user) return;

    try {
      const {
        usuario: usuarioData,
        professor: professorData,
        aluno: alunoData,
      } = await loadProfile(session.user.id);

      setUsuario(usuarioData);
      setProfessor(professorData);
      setAluno(alunoData);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        professor,
        aluno,
        session,
        loading,
        signIn,
        loginAluno,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth deve ser usado dentro de AuthProvider"
    );
  }

  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRequireRole(roles: TipoUsuario[]) {
  const { usuario, loading } = useAuth();

  const authorized =
    !!usuario && roles.includes(usuario.tipo_usuario);

  return {
    usuario,
    loading,
    authorized,
  };
}