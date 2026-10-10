CREATE SCHEMA IF NOT EXISTS product;
CREATE SCHEMA IF NOT EXISTS engineering;
CREATE SCHEMA IF NOT EXISTS assets;

INSERT INTO identity.permissions(id, description) VALUES
  ('product.read', 'View product hierarchy and commercial product facts'),
  ('product.write', 'Create and edit product hierarchy'),
  ('engineering.read', 'View parts, BOM revisions and build specifications'),
  ('engineering.write', 'Create and edit draft engineering facts'),
  ('engineering.release', 'Release BOM revisions and build specifications'),
  ('asset.read', 'View asset metadata and business links'),
  ('asset.write', 'Register asset metadata and business links')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('product_manager', 'Product manager', 'Manage product hierarchy and product assets'),
  ('engineering_manager', 'Engineering manager', 'Manage and release engineering specifications'),
  ('product_viewer', 'Product viewer', 'Read-only product and engineering access')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('product_manager', 'product.read'),
  ('product_manager', 'product.write'),
  ('product_manager', 'engineering.read'),
  ('product_manager', 'asset.read'),
  ('product_manager', 'asset.write'),
  ('engineering_manager', 'product.read'),
  ('engineering_manager', 'engineering.read'),
  ('engineering_manager', 'engineering.write'),
  ('engineering_manager', 'engineering.release'),
  ('engineering_manager', 'asset.read'),
  ('engineering_manager', 'asset.write'),
  ('product_viewer', 'product.read'),
  ('product_viewer', 'engineering.read'),
  ('product_viewer', 'asset.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id
FROM identity.permissions
WHERE id IN ('product.read','product.write','engineering.read','engineering.write','engineering.release','asset.read','asset.write')
ON CONFLICT DO NOTHING;

CREATE TABLE product.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code = upper(code))
);

CREATE TABLE product.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES product.platforms(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code = upper(code))
);
CREATE INDEX product_models_platform_idx ON product.models(platform_id, code);

CREATE TABLE product.variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES product.models(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, code),
  CHECK (code = upper(code))
);

CREATE TABLE product.skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product.variants(id) ON DELETE RESTRICT,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  market_code char(2),
  color_code text,
  size_code text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sku = upper(sku))
);
CREATE INDEX product_skus_variant_idx ON product.skus(variant_id, sku);

INSERT INTO product.platforms(code, name, description, status) VALUES
  ('FC', 'Folding Carbon', 'Carbon folding bicycle technology platform', 'ACTIVE'),
  ('FT', 'Fat Tire', 'Fat-tire bicycle technology platform', 'ACTIVE'),
  ('CT', 'City Touring', 'Urban and city-touring bicycle technology platform', 'ACTIVE'),
  ('GT', 'Grand Touring', 'Gravel and long-distance touring technology platform', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE engineering.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'GENERAL',
  default_unit text NOT NULL DEFAULT 'EA',
  description text NOT NULL DEFAULT '',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (part_number = upper(part_number))
);

CREATE TABLE engineering.boms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES product.models(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code = upper(code))
);

CREATE TABLE engineering.bom_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES engineering.boms(id) ON DELETE RESTRICT,
  revision_code text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RELEASED')),
  notes text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  released_at timestamptz,
  released_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bom_id, revision_code),
  CHECK (revision_code = upper(revision_code))
);

CREATE TABLE engineering.bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES engineering.bom_revisions(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  part_id uuid NOT NULL REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'EA',
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (revision_id, line_no)
);

CREATE TABLE engineering.build_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  sku_id uuid NOT NULL REFERENCES product.skus(id) ON DELETE RESTRICT,
  bom_revision_id uuid NOT NULL REFERENCES engineering.bom_revisions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RELEASED')),
  notes text NOT NULL DEFAULT '',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  effective_from timestamptz,
  released_at timestamptz,
  released_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code = upper(code))
);

CREATE OR REPLACE FUNCTION engineering.require_draft_bom_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  revision_id_value uuid;
  revision_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN revision_id_value := OLD.revision_id; ELSE revision_id_value := NEW.revision_id; END IF;
  SELECT status INTO revision_status FROM engineering.bom_revisions WHERE id = revision_id_value;
  IF revision_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Released BOM revisions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER bom_lines_require_draft_revision
BEFORE INSERT OR UPDATE OR DELETE ON engineering.bom_lines
FOR EACH ROW EXECUTE FUNCTION engineering.require_draft_bom_revision();

CREATE OR REPLACE FUNCTION engineering.protect_released_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'RELEASED' THEN
    RAISE EXCEPTION 'Released BOM revisions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER bom_revision_no_mutation_after_release
BEFORE UPDATE OR DELETE ON engineering.bom_revisions
FOR EACH ROW EXECUTE FUNCTION engineering.protect_released_revision();

CREATE OR REPLACE FUNCTION engineering.protect_build_spec() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  revision_status text;
BEGIN
  IF OLD.status = 'RELEASED' THEN
    RAISE EXCEPTION 'Released Build Specifications are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'RELEASED' THEN
    SELECT status INTO revision_status FROM engineering.bom_revisions WHERE id = NEW.bom_revision_id;
    IF revision_status IS DISTINCT FROM 'RELEASED' THEN
      RAISE EXCEPTION 'Build Specification requires a released BOM revision';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER build_spec_release_guard
BEFORE UPDATE OR DELETE ON engineering.build_specs
FOR EACH ROW EXECUTE FUNCTION engineering.protect_build_spec();

CREATE TABLE assets.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  bucket text NOT NULL,
  object_key text NOT NULL,
  checksum_sha256 char(64),
  content_type text,
  byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  original_filename text,
  visibility text NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE','INTERNAL','PUBLIC')),
  classification text NOT NULL DEFAULT 'OTHER' CHECK (classification IN ('PRODUCT_MEDIA','ENGINEERING_DOC','MANUAL','CERTIFICATE','OTHER')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, bucket, object_key)
);

CREATE TABLE assets.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets.objects(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('product.platform','product.model','product.variant','product.sku','engineering.part','engineering.bom_revision','engineering.build_spec')),
  entity_id uuid NOT NULL,
  purpose text NOT NULL DEFAULT 'GENERAL',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, entity_type, entity_id, purpose)
);
CREATE INDEX asset_links_entity_idx ON assets.links(entity_type, entity_id, sort_order);
