PRAGMA foreign_keys = ON;

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'used' CHECK (condition IN ('new', 'used')),
  sold INTEGER NOT NULL DEFAULT 0 CHECK (sold IN (0, 1)),
  pricing_hire INTEGER,
  pricing_sales INTEGER,
  pricing_lease INTEGER,
  availability_hire INTEGER NOT NULL DEFAULT 0 CHECK (availability_hire IN (0, 1)),
  availability_sales INTEGER NOT NULL DEFAULT 0 CHECK (availability_sales IN (0, 1)),
  availability_lease INTEGER NOT NULL DEFAULT 0 CHECK (availability_lease IN (0, 1)),
  promoted_hire INTEGER NOT NULL DEFAULT 0 CHECK (promoted_hire IN (0, 1)),
  promoted_sales INTEGER NOT NULL DEFAULT 0 CHECK (promoted_sales IN (0, 1)),
  promoted_lease INTEGER NOT NULL DEFAULT 0 CHECK (promoted_lease IN (0, 1)),
  description TEXT,
  storage_width REAL,
  storage_height REAL,
  storage_length REAL,
  cargo REAL,
  seats INTEGER,
  doors INTEGER,
  engine_size REAL,
  fuel_type TEXT,
  fuel_economy REAL,
  transmission TEXT,
  height REAL,
  mileage INTEGER,
  year INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX vehicles_live_category ON vehicles (category, deleted_at);
CREATE INDEX vehicles_live_hire ON vehicles (availability_hire, pricing_hire) WHERE deleted_at IS NULL;
CREATE INDEX vehicles_live_sales ON vehicles (availability_sales, pricing_sales) WHERE deleted_at IS NULL;
CREATE INDEX vehicles_live_lease ON vehicles (availability_lease, pricing_lease) WHERE deleted_at IS NULL;
CREATE INDEX vehicles_live_updated ON vehicles (updated_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE vehicle_images (
  vehicle_id TEXT NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  small_key TEXT NOT NULL,
  large_key TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  PRIMARY KEY (vehicle_id, position)
);

CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE INDEX enquiries_created ON enquiries (created_at DESC);
