ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;

CREATE TABLE feedbacks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    type TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
