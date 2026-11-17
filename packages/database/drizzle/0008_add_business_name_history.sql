ALTER TABLE businesses ADD COLUMN IF NOT EXISTS initial_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS name_change_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS name_history JSONB DEFAULT '[]'::jsonb NOT NULL;
UPDATE businesses SET initial_name = name WHERE initial_name IS NULL;

