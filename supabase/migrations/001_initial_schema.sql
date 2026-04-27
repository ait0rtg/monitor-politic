-- Monitor Politic Municipal - Castell-Platja d'Aro
-- Versio final corregida - sense errors

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Taula usuaris
CREATE TABLE IF NOT EXISTS usuaris (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  nom         TEXT NOT NULL,
  role        TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  aprovat     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

ALTER TABLE usuaris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuaris veuen el seu perfil" ON usuaris
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin veu tots els usuaris" ON usuaris
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuaris u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Taula monitoratge
CREATE TABLE IF NOT EXISTS monitoratge (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_original             TEXT UNIQUE NOT NULL,
  font                     TEXT,
  tipus                    TEXT,
  tipus_document           TEXT,
  tipus_tramit             TEXT,
  titol                    TEXT,
  contingut_complet        TEXT,
  resum                    TEXT,
  classificacio            TEXT CHECK (classificacio IN ('URGENT','IMPORTANT','INFORMATIU')),
  nivell_confianca         TEXT CHECK (nivell_confianca IN ('ALTA','MITJA','BAIXA')),
  data_deteccio            TIMESTAMPTZ DEFAULT NOW(),
  venciment                DATE,
  import_detectat          NUMERIC(12,2),
  tema_principal           TEXT,
  proposta_accio           TEXT,
  pregunta_ple_suggerida   TEXT,
  requereix_revisio_manual BOOLEAN DEFAULT FALSE,
  estat_seguiment          TEXT DEFAULT 'pendent' CHECK (estat_seguiment IN ('pendent','en_curs','tancat')),
  recordatori_30d          DATE GENERATED ALWAYS AS (data_deteccio::DATE + INTERVAL '30 days') STORED,
  recordatori_90d          DATE GENERATED ALWAYS AS (data_deteccio::DATE + INTERVAL '90 days') STORED,
  recordatori_180d         DATE GENERATED ALWAYS AS (data_deteccio::DATE + INTERVAL '180 days') STORED,
  observacions             TEXT,
  estat                    TEXT DEFAULT 'nou' CHECK (estat IN ('nou','revisat','arxivat'))
);

CREATE INDEX IF NOT EXISTS idx_mon_url     ON monitoratge(url_original);
CREATE INDEX IF NOT EXISTS idx_mon_classif ON monitoratge(classificacio);
CREATE INDEX IF NOT EXISTS idx_mon_data    ON monitoratge(data_deteccio DESC);
CREATE INDEX IF NOT EXISTS idx_mon_venc    ON monitoratge(venciment) WHERE venciment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mon_tema    ON monitoratge(tema_principal);
CREATE INDEX IF NOT EXISTS idx_mon_import  ON monitoratge(import_detectat) WHERE import_detectat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mon_estat   ON monitoratge(estat_seguiment);

ALTER TABLE monitoratge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuaris autenticats llegeixen monitoratge" ON monitoratge
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuaris editen observacions monitoratge" ON monitoratge
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (TRUE);

CREATE POLICY "Admin i service editen monitoratge" ON monitoratge
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM usuaris u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Taula expedients BPM
CREATE TABLE IF NOT EXISTS expedients_bpm (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          TEXT UNIQUE NOT NULL,
  tipus           TEXT CHECK (tipus IN ('decret','registre_entrada')),
  data            DATE,
  titol           TEXT,
  assumpte        TEXT,
  area            TEXT,
  unitat_treball  TEXT,
  contingut       TEXT,
  tema            TEXT,
  tema_detallat   TEXT,
  tractat         BOOLEAN DEFAULT FALSE,
  estat           TEXT DEFAULT 'obert',
  url_expedient   TEXT,
  url_document    TEXT,
  nom_interessat  TEXT,
  any_num         INTEGER,
  mes_num         INTEGER,
  resum_ia        TEXT,
  classificacio   TEXT CHECK (classificacio IN ('URGENT','IMPORTANT','INFORMATIU')),
  estat_seguiment TEXT DEFAULT 'pendent' CHECK (estat_seguiment IN ('pendent','en_curs','tancat')),
  recordatori_30d  DATE GENERATED ALWAYS AS (data + INTERVAL '30 days') STORED,
  recordatori_90d  DATE GENERATED ALWAYS AS (data + INTERVAL '90 days') STORED,
  recordatori_180d DATE GENERATED ALWAYS AS (data + INTERVAL '180 days') STORED,
  observacions    TEXT,
  data_deteccio   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bpm_numero  ON expedients_bpm(numero);
CREATE INDEX IF NOT EXISTS idx_bpm_tipus   ON expedients_bpm(tipus);
CREATE INDEX IF NOT EXISTS idx_bpm_any     ON expedients_bpm(any_num);
CREATE INDEX IF NOT EXISTS idx_bpm_tema    ON expedients_bpm(tema);
CREATE INDEX IF NOT EXISTS idx_bpm_estat   ON expedients_bpm(estat);
CREATE INDEX IF NOT EXISTS idx_bpm_tractat ON expedients_bpm(tractat);
CREATE INDEX IF NOT EXISTS idx_bpm_data    ON expedients_bpm(data DESC);

ALTER TABLE expedients_bpm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuaris llegeixen BPM" ON expedients_bpm
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin i service escriuen BPM" ON expedients_bpm
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM usuaris u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Taula compromisos
CREATE TABLE IF NOT EXISTS compromisos (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titol                TEXT NOT NULL,
  descripcio           TEXT,
  font_compromis       TEXT NOT NULL,
  data_compromis       DATE NOT NULL,
  termini_anunciat     DATE,
  estat                TEXT DEFAULT 'pendent' CHECK (estat IN ('pendent','en_curs','complet','incomplert','abandonat')),
  evidencia_compliment TEXT,
  tema                 TEXT,
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentaris_compromisos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  compromis_id UUID REFERENCES compromisos(id) ON DELETE CASCADE,
  contingut    TEXT NOT NULL,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compromisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Llegir compromisos" ON compromisos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin gestiona compromisos" ON compromisos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuaris u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

ALTER TABLE comentaris_compromisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Llegir comentaris" ON comentaris_compromisos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuaris afegeixen comentaris" ON comentaris_compromisos
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin gestiona comentaris" ON comentaris_compromisos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuaris u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Funcio stats dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_documents',         (SELECT COUNT(*) FROM monitoratge),
    'urgents_setmana',         (SELECT COUNT(*) FROM monitoratge WHERE classificacio = 'URGENT' AND data_deteccio >= NOW() - INTERVAL '7 days'),
    'venciments_7dies',        (SELECT COUNT(*) FROM monitoratge WHERE venciment IS NOT NULL AND venciment BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'),
    'pendents_90dies',         (SELECT COUNT(*) FROM monitoratge WHERE estat_seguiment = 'pendent' AND data_deteccio < NOW() - INTERVAL '90 days'),
    'compromisos_incomplerts', (SELECT COUNT(*) FROM compromisos WHERE estat IN ('pendent','incomplert'))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger admin automatic
CREATE OR REPLACE FUNCTION set_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'aitor.tendero@gmail.com' THEN
    NEW.role    := 'admin';
    NEW.aprovat := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_admin
  BEFORE INSERT ON usuaris
  FOR EACH ROW EXECUTE FUNCTION set_admin_role();
