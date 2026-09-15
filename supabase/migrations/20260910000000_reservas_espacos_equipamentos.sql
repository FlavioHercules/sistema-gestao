-- Reservas de espacos e equipamentos.
-- Execute esta migration no projeto Supabase antes de usar os novos menus.

CREATE TABLE IF NOT EXISTS public.espacos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro',
  capacidade integer,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espaco_id uuid NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  data date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  finalidade text NOT NULL,
  status text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (hora_fim > hora_inicio)
);

CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro',
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservas_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  finalidade text NOT NULL,
  status text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (hora_fim > hora_inicio)
);

ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_gestor_reservas()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND tipo_usuario IN ('secretaria', 'coordenacao')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coordenacao()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND tipo_usuario = 'coordenacao'
  );
$$;

DROP POLICY IF EXISTS "espacos_select" ON public.espacos;
CREATE POLICY "espacos_select" ON public.espacos FOR SELECT TO authenticated USING (ativo = true OR public.is_gestor_reservas());
DROP POLICY IF EXISTS "espacos_insert" ON public.espacos;
CREATE POLICY "espacos_insert" ON public.espacos FOR INSERT TO authenticated WITH CHECK (public.is_coordenacao());
DROP POLICY IF EXISTS "espacos_update" ON public.espacos;
CREATE POLICY "espacos_update" ON public.espacos FOR UPDATE TO authenticated USING (public.is_coordenacao()) WITH CHECK (public.is_coordenacao());
DROP POLICY IF EXISTS "espacos_delete" ON public.espacos;
CREATE POLICY "espacos_delete" ON public.espacos FOR DELETE TO authenticated USING (public.is_coordenacao());

DROP POLICY IF EXISTS "reservas_select" ON public.reservas;
CREATE POLICY "reservas_select" ON public.reservas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reservas_insert" ON public.reservas;
CREATE POLICY "reservas_insert" ON public.reservas FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id AND (public.is_gestor_reservas() OR EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo_usuario = 'professor')));
DROP POLICY IF EXISTS "reservas_update" ON public.reservas;
CREATE POLICY "reservas_update" ON public.reservas FOR UPDATE TO authenticated USING (usuario_id = auth.uid() OR public.is_gestor_reservas()) WITH CHECK (usuario_id = auth.uid() OR public.is_gestor_reservas());
DROP POLICY IF EXISTS "reservas_delete" ON public.reservas;
CREATE POLICY "reservas_delete" ON public.reservas FOR DELETE TO authenticated USING (usuario_id = auth.uid() OR public.is_gestor_reservas());

DROP POLICY IF EXISTS "equipamentos_select" ON public.equipamentos;
CREATE POLICY "equipamentos_select" ON public.equipamentos FOR SELECT TO authenticated USING (ativo = true OR public.is_gestor_reservas());
DROP POLICY IF EXISTS "equipamentos_insert" ON public.equipamentos;
CREATE POLICY "equipamentos_insert" ON public.equipamentos FOR INSERT TO authenticated WITH CHECK (public.is_coordenacao());
DROP POLICY IF EXISTS "equipamentos_update" ON public.equipamentos;
CREATE POLICY "equipamentos_update" ON public.equipamentos FOR UPDATE TO authenticated USING (public.is_coordenacao()) WITH CHECK (public.is_coordenacao());
DROP POLICY IF EXISTS "equipamentos_delete" ON public.equipamentos;
CREATE POLICY "equipamentos_delete" ON public.equipamentos FOR DELETE TO authenticated USING (public.is_coordenacao());

DROP POLICY IF EXISTS "reservas_equipamentos_select" ON public.reservas_equipamentos;
CREATE POLICY "reservas_equipamentos_select" ON public.reservas_equipamentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reservas_equipamentos_insert" ON public.reservas_equipamentos;
CREATE POLICY "reservas_equipamentos_insert" ON public.reservas_equipamentos FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id AND (public.is_gestor_reservas() OR EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo_usuario IN ('professor', 'secretaria'))));
DROP POLICY IF EXISTS "reservas_equipamentos_update" ON public.reservas_equipamentos;
CREATE POLICY "reservas_equipamentos_update" ON public.reservas_equipamentos FOR UPDATE TO authenticated USING (usuario_id = auth.uid() OR public.is_gestor_reservas()) WITH CHECK (usuario_id = auth.uid() OR public.is_gestor_reservas());
DROP POLICY IF EXISTS "reservas_equipamentos_delete" ON public.reservas_equipamentos;
CREATE POLICY "reservas_equipamentos_delete" ON public.reservas_equipamentos FOR DELETE TO authenticated USING (usuario_id = auth.uid() OR public.is_gestor_reservas());

CREATE INDEX IF NOT EXISTS idx_reservas_espaco_data ON public.reservas(espaco_id, data);
CREATE INDEX IF NOT EXISTS idx_reservas_equipamento_data ON public.reservas_equipamentos(equipamento_id, data);
