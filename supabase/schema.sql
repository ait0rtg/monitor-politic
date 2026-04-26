-- ================================================================
-- MONITOR POLITIC MUNICIPAL — Castell-Platja d'Aro
-- Schema Supabase — Executa tot al SQL Editor de Supabase
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── PROFILES ──────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT NOT NULL,
  nom        TEXT,
  rol        TEXT DEFAULT 'pendent' CHECK (rol IN ('admin','usuari','pendent','rebutjat')),
  idioma     TEXT DEFAULT 'ca' CHECK (idioma IN ('ca','es')),
  creat_el   TIMESTAMPTZ DEFAULT NOW(),
  aprovat_el TIMESTAMPTZ
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Veu el seu perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin veu tots els perfils" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Admin actualitza qualsevol perfil" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Usuari actualitza el seu perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, rol)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email,'@',1)),
    CASE WHEN NEW.email = 'aitor.tendero@gmail.com' THEN 'admin' ELSE 'pendent' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE documents (
  id                       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url_original             TEXT UNIQUE NOT NULL,
  font                     TEXT NOT NULL,
  tipus                    TEXT,
  tipus_document           TEXT,
  titol                    TEXT,
  contingut_complet        TEXT,
  resum                    TEXT,
  classificacio            TEXT CHECK (classificacio IN ('URGENT','IMPORTANT','INFORMATIU')),
  nivell_confianca         TEXT CHECK (nivell_confianca IN ('ALTA','MITJA','BAIXA')),
  data_deteccio            TIMESTAMPTZ DEFAULT NOW(),
  data_document            DATE,
  venciment                DATE,
  import_detectat          NUMERIC(14,2),
  tema_principal           TEXT,
  proposta_accio           TEXT,
  pregunta_ple_suggerida   TEXT,
  requereix_revisio_manual BOOLEAN DEFAULT FALSE,
  estat_seguiment          TEXT DEFAULT 'pendent' CHECK (estat_seguiment IN ('pendent','en_curs','tancat')),
  observacions             TEXT,
  estat                    TEXT DEFAULT 'nou' CHECK (estat IN ('nou','revisat','arxivat')),
  numero_bpm               TEXT,
  area_bpm                 TEXT,
  nom_interessat           TEXT,
  recordatori_30d          DATE GENERATED ALWAYS AS (data_deteccio::DATE + INTERVAL '30 days') STORED,
  recordatori_90d          DATE GENERATED ALWAYS AS (data_deteccio::DATE + INTERVAL '90 days') STORED,
  recordatori_180d         DATE GENERATED ALWAYS AS (data_deteccio::DATE + INTERVAL '180 days') STORED
);

CREATE INDEX idx_doc_url      ON documents(url_original);
CREATE INDEX idx_doc_font     ON documents(font);
CREATE INDEX idx_doc_classif  ON documents(classificacio);
CREATE INDEX idx_doc_data     ON documents(data_deteccio DESC);
CREATE INDEX idx_doc_venc     ON documents(venciment) WHERE venciment IS NOT NULL;
CREATE INDEX idx_doc_import   ON documents(import_detectat) WHERE import_detectat IS NOT NULL;
CREATE INDEX idx_doc_tema     ON documents(tema_principal);
CREATE INDEX idx_doc_estat    ON documents(estat_seguiment);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovats veuen documents" ON documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin','usuari'))
);
CREATE POLICY "Sistema insereix documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin actualitza tot" ON documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Usuari actualitza observacions" ON documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'usuari')
);

-- ── COMPROMISOS ───────────────────────────────────────────────
CREATE TABLE compromisos (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titol            TEXT NOT NULL,
  descripcio       TEXT,
  font_compromis   TEXT,
  data_compromis   DATE,
  termini_anunciat DATE,
  estat            TEXT DEFAULT 'pendent' CHECK (estat IN ('pendent','en_curs','complet','incomplert','abandonat')),
  evidencia_url    TEXT,
  evidencia_nota   TEXT,
  tema             TEXT,
  creat_per        UUID REFERENCES profiles(id),
  creat_el         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compromisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aprovats veuen compromisos" ON compromisos FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin','usuari'))
);
CREATE POLICY "Admin crea compromisos" ON compromisos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Admin actualitza compromisos" ON compromisos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);

-- ── COMENTARIS ────────────────────────────────────────────────
CREATE TABLE comentaris_compromisos (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  compromis_id UUID REFERENCES compromisos(id) ON DELETE CASCADE,
  usuari_id    UUID REFERENCES profiles(id),
  text         TEXT NOT NULL,
  creat_el     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comentaris_compromisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aprovats veuen comentaris" ON comentaris_compromisos FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin','usuari'))
);
CREATE POLICY "Aprovats afegeixen comentaris" ON comentaris_compromisos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin','usuari'))
);

-- ── EXECUCIONS (log) ─────────────────────────────────────────
CREATE TABLE execucions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inici           TIMESTAMPTZ DEFAULT NOW(),
  fi              TIMESTAMPTZ,
  torn            TEXT CHECK (torn IN ('mati','tarda','manual')),
  total_detectats INTEGER DEFAULT 0,
  total_nous      INTEGER DEFAULT 0,
  urgents         INTEGER DEFAULT 0,
  importants      INTEGER DEFAULT 0,
  informatius     INTEGER DEFAULT 0,
  errors          JSONB DEFAULT '[]',
  estat           TEXT DEFAULT 'en_curs' CHECK (estat IN ('en_curs','completat','error'))
);

-- ── VISTES ───────────────────────────────────────────────────
CREATE VIEW v_documents_actius AS
SELECT * FROM documents
WHERE estat_seguiment IN ('pendent','en_curs') AND estat != 'arxivat'
ORDER BY
  CASE classificacio WHEN 'URGENT' THEN 1 WHEN 'IMPORTANT' THEN 2 ELSE 3 END,
  data_deteccio DESC;

CREATE VIEW v_venciments_propers AS
SELECT *, (venciment - CURRENT_DATE) AS dies_restants
FROM documents
WHERE venciment IS NOT NULL AND venciment >= CURRENT_DATE
  AND venciment <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY venciment ASC;

CREATE VIEW v_stats AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE classificacio='URGENT') AS urgents,
  COUNT(*) FILTER (WHERE classificacio='IMPORTANT') AS importants,
  COUNT(*) FILTER (WHERE estat_seguiment='pendent') AS pendents,
  COUNT(*) FILTER (WHERE venciment BETWEEN CURRENT_DATE AND CURRENT_DATE+7) AS vencen_7dies,
  COUNT(*) FILTER (WHERE data_deteccio >= NOW()-INTERVAL '24 hours') AS ultimes_24h
FROM documents;
