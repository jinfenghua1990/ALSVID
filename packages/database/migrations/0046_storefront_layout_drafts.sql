-- One shared draft per page. Publishing and public rendering are separate concerns.
CREATE TABLE commerce.storefront_layout_drafts (
  page_key text PRIMARY KEY CHECK (page_key = 'homepage'),
  project jsonb NOT NULL CHECK (jsonb_typeof(project) = 'object'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
