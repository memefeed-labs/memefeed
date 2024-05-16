CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY, -- 8 bytes
  address VARCHAR(255) NOT NULL UNIQUE, -- 40-60 bytes
  username VARCHAR(255) UNIQUE NOT NULL, -- ~20 bytes
  tx_status VARCHAR(255) NOT NULL, -- pending, final, fail
  tx_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY, -- 8 bytes
  creator_id BIGINT NOT NULL REFERENCES users(id), -- address is 40-60 bytes
  name VARCHAR(255) UNIQUE NOT NULL, -- 20 bytes
  description VARCHAR(1024) NOT NULL, -- 255 bytes
  type VARCHAR(255) NOT NULL, -- public or private -- 1 byte
  password VARCHAR(255), -- only for public rooms -- 32 bytes (sha256)
  logo_url VARCHAR(1024) UNIQUE NOT NULL, -- 32 bytes (sha256)
  tx_status VARCHAR(255) NOT NULL, -- pending, final, fail
  tx_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- many to many relationship between users and rooms
CREATE TABLE IF NOT EXISTS user_rooms (
  id BIGSERIAL PRIMARY KEY, -- 8 bytes
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_visit TIMESTAMP NOT NULL DEFAULT NOW(), -- 20 bytes (timestamp)
  user_id BIGINT NOT NULL REFERENCES users(id), -- 40-60 bytes
  room_id BIGINT NOT NULL REFERENCES rooms(id) -- 8 bytes
);

CREATE TABLE IF NOT EXISTS memes (
  id BIGSERIAL PRIMARY KEY, -- 8 bytes
  creator_id BIGINT NOT NULL REFERENCES users(id), -- address is 40-60 bytes
  room_id BIGINT NOT NULL REFERENCES rooms(id), -- 8 bytes
  url VARCHAR(1024) UNIQUE NOT NULL, -- 32 bytes (sha256)
  likes_count INTEGER NOT NULL DEFAULT 0, -- can be derived from likes table
  tx_status VARCHAR(255) NOT NULL, -- pending, final, fail
  tx_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meme_likes (
  id BIGSERIAL PRIMARY KEY, -- 8 bytes
  liker_id BIGINT NOT NULL REFERENCES users(id), -- address is 40-60 bytes
  meme_id BIGINT NOT NULL REFERENCES memes(id), -- 8 bytes
  tx_status VARCHAR(255) NOT NULL, -- pending, final, fail
  tx_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CONSTRAINTS
ALTER TABLE meme_likes ADD CONSTRAINT unique_meme_liker UNIQUE (meme_id, liker_id);
ALTER TABLE user_rooms ADD CONSTRAINT unique_user_room UNIQUE (user_id, room_id);
ALTER TABLE rooms ADD CONSTRAINT type_check CHECK (type IN ('public', 'private'));

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_address ON users (address);
CREATE INDEX IF NOT EXISTS idx_memes_creator ON memes (creator_id);
CREATE INDEX IF NOT EXISTS idx_room_id_memes ON memes (room_id);
CREATE INDEX IF NOT EXISTS idx_room_creator ON memes (creator_id, room_id);
CREATE INDEX IF NOT EXISTS idx_room_id_rooms ON user_rooms (room_id);
CREATE INDEX IF NOT EXISTS idx_user_id_rooms ON user_rooms (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_id ON meme_likes (liker_id);
CREATE INDEX IF NOT EXISTS idx_meme_id_likes ON meme_likes (meme_id);

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
