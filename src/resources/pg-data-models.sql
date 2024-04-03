CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  creator_address VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) UNIQUE NOT NULL,
  description VARCHAR(1024) NOT NULL,
  type VARCHAR(255) NOT NULL, -- public or private
  password VARCHAR(255), -- only for public rooms
  logo_url VARCHAR(1024) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- many to many relationship between users and rooms
CREATE TABLE IF NOT EXISTS user_rooms (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_visit TIMESTAMP NOT NULL DEFAULT NOW(),
  address VARCHAR(255) NOT NULL,
  room_id BIGINT NOT NULL REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS memes (
  id BIGSERIAL PRIMARY KEY,
  creator_address VARCHAR(255) NOT NULL,
  room_id BIGINT NOT NULL REFERENCES rooms(id),
  url VARCHAR(1024) UNIQUE NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meme_likes (
  id BIGSERIAL PRIMARY KEY,
  liker_address VARCHAR(255) NOT NULL,
  meme_id BIGINT NOT NULL REFERENCES memes(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CONSTRAINTS
ALTER TABLE meme_likes ADD CONSTRAINT unique_meme_liker UNIQUE (meme_id, liker_address);
ALTER TABLE user_rooms ADD CONSTRAINT unique_user_room UNIQUE (address, room_id);
ALTER TABLE rooms ADD CONSTRAINT type_check CHECK (type IN ('public', 'private'));

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_memes_address ON memes (creator_address);
CREATE INDEX IF NOT EXISTS idx_room_id_memes ON memes (room_id);
CREATE INDEX IF NOT EXISTS idx_room_address ON memes (creator_address, room_id);

CREATE INDEX IF NOT EXISTS idx_room_id_rooms ON user_rooms (room_id);
CREATE INDEX IF NOT EXISTS idx_address_rooms ON user_rooms (address);

-- TRIGGERS

-- update likes count trigger
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memes
        SET likes_count = likes_count + 1
        WHERE id = NEW.meme_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memes
        SET likes_count = likes_count - 1
        WHERE id = OLD.meme_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_likes_trigger
AFTER INSERT OR DELETE ON meme_likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp_trigger_rooms
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_timestamp_trigger_memes
BEFORE UPDATE ON memes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- new meme added notification
CREATE OR REPLACE FUNCTION notify_new_meme()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_meme', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_new_meme_trigger
AFTER INSERT ON memes
FOR EACH ROW EXECUTE FUNCTION notify_new_meme();