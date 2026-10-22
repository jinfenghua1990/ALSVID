-- A customer-facing catalogue publication is a separate reviewed fact.
-- Internal ACTIVE and the homepage Model ID binding are not publication approval.
INSERT INTO identity.permissions(id,description) VALUES
 ('product.publish','Approve or withdraw public product catalogue publications')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id,permission_id)
SELECT 'system_admin','product.publish'
WHERE EXISTS (SELECT 1 FROM identity.roles WHERE id='system_admin')
ON CONFLICT DO NOTHING;

CREATE TABLE product.catalog_publications (
  model_id uuid PRIMARY KEY REFERENCES product.models(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','PUBLISHED','WITHDRAWN')),
  title_zh text NOT NULL DEFAULT '',
  title_de text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  image_path text NOT NULL DEFAULT '',
  evidence_note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  submitted_at timestamptz,
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_catalog_publications_public_idx
ON product.catalog_publications(published_at DESC)
WHERE status='PUBLISHED';
