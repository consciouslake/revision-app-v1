-- Subjects Table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_emoji VARCHAR(10)
);

-- Chapters Table
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id),
    title VARCHAR(255) NOT NULL,
    pdf_url TEXT,
    raw_text_content TEXT,
    notebooklm_summary TEXT
);

-- User Progress Table
CREATE TABLE user_progress (
    user_id INTEGER, -- Mock user ID for now
    chapter_id INTEGER REFERENCES chapters(id),
    is_completed BOOLEAN DEFAULT FALSE,
    last_read_position INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, chapter_id)
);
