
CREATE TABLE public.links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  user_id UUID,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_links_slug ON public.links(slug);
CREATE INDEX idx_links_user_id ON public.links(user_id);

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Anyone can read links (needed for redirects to work without auth)
CREATE POLICY "Links are publicly readable"
  ON public.links FOR SELECT
  USING (true);

-- Anyone can create links (anonymous shortening allowed)
CREATE POLICY "Anyone can create links"
  ON public.links FOR INSERT
  WITH CHECK (true);

-- Only owner can update/delete their own links (when user_id is set)
CREATE POLICY "Users can update own links"
  ON public.links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own links"
  ON public.links FOR DELETE
  USING (auth.uid() = user_id);
