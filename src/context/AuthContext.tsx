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
import type { Usuario, Professor, TipoUsuario, Aluno } from "../lib/supabase";

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

  async function applySession(s: Session | null) {
    setSession(s);
    if (s?.user) {
      try {
        const { usuario: u, professor: p, aluno: a } = await loadProfile(s.user.id);
        setUsuario(u);
        setProfessor(p);
        setAluno(a);
      } catch (err) {
        console.error("Failed to load profile", err);
        setUsuario(null);
        setProfessor(null);
        setAluno(null);
      }
    } else {
      setUsuario(null);
      setProfessor(null);
      setAluno(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      (async () => {
        await applySession(data.session);
        setLoading(false);
      })();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        await applySession(s);
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }

  async function loginAluno(alunoRecord: Aluno) {
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
    setSession(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUsuario(null);
    setProfessor(null);
    setAluno(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (session?.user) {
      const { usuario: u, professor: p, aluno: a } = await loadProfile(session.user.id);
      setUsuario(u);
      setProfessor(p);
      setAluno(a);
    }
  }

  return (
    <AuthContext.Provider
      value={{ usuario, professor, aluno, session, loading, signIn, loginAluno, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRequireRole(roles: TipoUsuario[]) {
  const { usuario, loading } = useAuth();
  const authorized = !!usuario && roles.includes(usuario.tipo_usuario);
  return { usuario, loading, authorized };
}
