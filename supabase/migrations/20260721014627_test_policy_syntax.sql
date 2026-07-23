/* minimal policy syntax test */
CREATE TABLE IF NOT EXISTS public._test_policy (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public._test_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tp_select" ON public._test_policy;
CREATE POLICY "tp_select" ON public._test_policy FOR SELECT TO authenticated USING (true);
DROP TABLE IF EXISTS public._test_policy;
