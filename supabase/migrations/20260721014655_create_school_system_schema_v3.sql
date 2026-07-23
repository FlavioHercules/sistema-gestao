/*
# School Management System - Schema (re-apply, single-line policies)

Re-applies schema with all CREATE POLICY statements on single lines to avoid
multi-line parsing issues. Idempotent via IF NOT EXISTS and DROP POLICY IF EXISTS.
*/

CREATE TABLE IF NOT EXISTS public.professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  disciplina text NOT NULL,
  usuario_id uuid UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  tipo_usuario text NOT NULL CHECK (tipo_usuario IN ('secretaria','professor','aluno')),
  professor_id uuid REFERENCES public.professores(id) ON DELETE SET NULL,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'professores_usuario_id_fkey') THEN
    ALTER TABLE public.professores ADD CONSTRAINT professores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  ano_letivo integer NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.turma_professores (
  turma_id uuid REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES public.professores(id) ON DELETE CASCADE,
  PRIMARY KEY (turma_id, professor_id)
);

CREATE TABLE IF NOT EXISTS public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  matricula text UNIQUE NOT NULL,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  data_nascimento date,
  observacao text,
  usuario_id uuid UNIQUE REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  nota_1 numeric(5,2),
  nota_2 numeric(5,2),
  nota_3 numeric(5,2),
  media numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, professor_id, turma_id)
);

ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_secretaria()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo_usuario = 'secretaria');
$$;

CREATE OR REPLACE FUNCTION public.current_professor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT professor_id FROM public.usuarios WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "prof_select" ON public.professores;
CREATE POLICY "prof_select" ON public.professores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "prof_insert" ON public.professores;
CREATE POLICY "prof_insert" ON public.professores FOR INSERT TO authenticated WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "prof_update" ON public.professores;
CREATE POLICY "prof_update" ON public.professores FOR UPDATE TO authenticated USING ((public.is_secretaria())) WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "prof_delete" ON public.professores;
CREATE POLICY "prof_delete" ON public.professores FOR DELETE TO authenticated USING ((public.is_secretaria()));

DROP POLICY IF EXISTS "usr_select" ON public.usuarios;
CREATE POLICY "usr_select" ON public.usuarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "usr_insert" ON public.usuarios;
CREATE POLICY "usr_insert" ON public.usuarios FOR INSERT TO authenticated WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "usr_update" ON public.usuarios;
CREATE POLICY "usr_update" ON public.usuarios FOR UPDATE TO authenticated USING ((public.is_secretaria())) WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "usr_delete" ON public.usuarios;
CREATE POLICY "usr_delete" ON public.usuarios FOR DELETE TO authenticated USING ((public.is_secretaria()));

DROP POLICY IF EXISTS "turma_select" ON public.turmas;
CREATE POLICY "turma_select" ON public.turmas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "turma_insert" ON public.turmas;
CREATE POLICY "turma_insert" ON public.turmas FOR INSERT TO authenticated WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "turma_update" ON public.turmas;
CREATE POLICY "turma_update" ON public.turmas FOR UPDATE TO authenticated USING ((public.is_secretaria())) WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "turma_delete" ON public.turmas;
CREATE POLICY "turma_delete" ON public.turmas FOR DELETE TO authenticated USING ((public.is_secretaria()));

DROP POLICY IF EXISTS "tp_select" ON public.turma_professores;
CREATE POLICY "tp_select" ON public.turma_professores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tp_insert" ON public.turma_professores;
CREATE POLICY "tp_insert" ON public.turma_professores FOR INSERT TO authenticated WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "tp_update" ON public.turma_professores;
CREATE POLICY "tp_update" ON public.turma_professores FOR UPDATE TO authenticated USING ((public.is_secretaria())) WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "tp_delete" ON public.turma_professores;
CREATE POLICY "tp_delete" ON public.turma_professores FOR DELETE TO authenticated USING ((public.is_secretaria()));

DROP POLICY IF EXISTS "alu_select" ON public.alunos;
CREATE POLICY "alu_select" ON public.alunos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "alu_insert" ON public.alunos;
CREATE POLICY "alu_insert" ON public.alunos FOR INSERT TO authenticated WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "alu_update" ON public.alunos;
CREATE POLICY "alu_update" ON public.alunos FOR UPDATE TO authenticated USING ((public.is_secretaria())) WITH CHECK ((public.is_secretaria()));
DROP POLICY IF EXISTS "alu_delete" ON public.alunos;
CREATE POLICY "alu_delete" ON public.alunos FOR DELETE TO authenticated USING ((public.is_secretaria()));

DROP POLICY IF EXISTS "notas_select" ON public.notas;
CREATE POLICY "notas_select" ON public.notas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notas_insert" ON public.notas;
CREATE POLICY "notas_insert" ON public.notas FOR INSERT TO authenticated WITH CHECK ((public.is_secretaria() OR (professor_id = public.current_professor_id())));
DROP POLICY IF EXISTS "notas_update" ON public.notas;
CREATE POLICY "notas_update" ON public.notas FOR UPDATE TO authenticated USING ((public.is_secretaria() OR (professor_id = public.current_professor_id()))) WITH CHECK ((public.is_secretaria() OR (professor_id = public.current_professor_id())));
DROP POLICY IF EXISTS "notas_delete" ON public.notas;
CREATE POLICY "notas_delete" ON public.notas FOR DELETE TO authenticated USING ((public.is_secretaria() OR (professor_id = public.current_professor_id())));

CREATE OR REPLACE FUNCTION public.compute_nota_media()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.media := (COALESCE(NEW.nota_1,0) + COALESCE(NEW.nota_2,0) + COALESCE(NEW.nota_3,0)) / 3.0;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_media ON public.notas;
CREATE TRIGGER trg_compute_media BEFORE INSERT OR UPDATE ON public.notas FOR EACH ROW EXECUTE FUNCTION public.compute_nota_media();

INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Informática 1º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Informática 1º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Informática 2º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Informática 2º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Informática 3º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Informática 3º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Agropecuária 1º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Agropecuária 1º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Agropecuária 2º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Agropecuária 2º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Agropecuária 3º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Agropecuária 3º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Nutrição 1º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Nutrição 1º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Nutrição 2º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Nutrição 2º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Nutrição 3º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Nutrição 3º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Segurança do Trabalho 1º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Segurança do Trabalho 1º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Segurança do Trabalho 2º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Segurança do Trabalho 2º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Segurança do Trabalho 3º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Segurança do Trabalho 3º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Edificações 1º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Edificações 1º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Edificações 2º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Edificações 2º');
INSERT INTO public.turmas (nome, ano_letivo) SELECT 'Edificações 3º', 2025 WHERE NOT EXISTS (SELECT 1 FROM public.turmas WHERE nome = 'Edificações 3º');

CREATE INDEX IF NOT EXISTS idx_alunos_turma ON public.alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_notas_aluno ON public.notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_professor ON public.notas(professor_id);
CREATE INDEX IF NOT EXISTS idx_notas_turma ON public.notas(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_professores_prof ON public.turma_professores(professor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_professor ON public.usuarios(professor_id);
