use rusqlite::{Connection, params};

pub struct LLMDatabase {
    conn: Connection,
}

impl LLMDatabase {
    pub fn new() -> rusqlite::Result<Self> {
        let conn = Connection::open("./dev.db")?;
        Ok(LLMDatabase { conn })
    }

    pub fn create_table(&self) -> rusqlite::Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS llm_provider (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    api_type TEXT NOT NULL,
                    description TEXT,
                    is_official BOOLEAN NOT NULL DEFAULT 0,
                    is_enabled BOOLEAN NOT NULL DEFAULT 0,
                    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
                );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS llm_model (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    llm_provider_id INTEGER NOT NULL,
                    code TEXT NOT NULL UNIQUE,
                    description TEXT,
                    vision_support BOOLEAN NOT NULL DEFAULT 0,
                    audio_support BOOLEAN NOT NULL DEFAULT 0,
                    video_support BOOLEAN NOT NULL DEFAULT 0,
                    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (llm_provider_id) REFERENCES llm_provider(id)
                );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS llm_provider_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    llm_provider_id INTEGER NOT NULL,
                    value TEXT,
                    append_location TEXT DEFAULT 'header',
                    is_addition BOOLEAN NOT NULL DEFAULT 0,
                    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
                );",
            [],
        )?;

        if let Err(err) = self.init_llm_provider() {
            println!("init_llm_provider error: {:?}", err);
        }
        Ok(())
    }


    pub fn add_llm_provider(&self, name: &str, api_type: &str, description: &str, is_official: bool, is_enabled: bool) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO llm_provider (name, api_type, description, is_official, is_enabled) VALUES (?, ?, ?, ?, ?)",
            params![name, api_type, description, is_official, is_enabled],
        )?;
        Ok(())
    }

    pub fn get_llm_providers(&self) -> rusqlite::Result<Vec<(i64, String, String, String, bool, bool)>> {
        let mut stmt = self.conn.prepare("SELECT id, name, api_type, description, is_official, is_enabled FROM llm_provider")?;
        let llm_providers = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?;

        let mut result = Vec::new();
        for llm_provider in llm_providers {
            result.push(llm_provider?);
        }
        Ok(result)
    }

    pub fn get_llm_provider(&self, id: i64) -> rusqlite::Result<(i64, String, String, String, bool, bool)> {
        let mut stmt = self.conn.prepare("SELECT id, name, api_type, description, is_official, is_enabled FROM llm_provider WHERE id = ?")?;
        let llm_providers = stmt.query_map([id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?;

        let mut result = (0, "".to_string(), "".to_string(), "".to_string(), false, false);
        for llm_provider in llm_providers {
            result = llm_provider?;
        }
        Ok(result)
    }

    pub fn update_llm_provider(&self, id: i64, name: &str, api_type: &str, description: &str, is_enabled: bool) -> rusqlite::Result<()> {
        self.conn.execute(
            "UPDATE llm_provider SET name = ?, api_type = ?, description = ?, is_enabled = ? WHERE id = ?",
            params![name, api_type, description, is_enabled, id],
        )?;
        Ok(())
    }

    pub fn delete_llm_provider(&self, id: i64) -> rusqlite::Result<()> {
        self.conn.execute(
            "DELETE FROM llm_provider WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_llm_provider_config(&self, llm_provider_id: i64) -> rusqlite::Result<Vec<(i64, String, i64, String, String, bool)>> {
        let mut stmt = self.conn.prepare("SELECT id, name, llm_provider_id, value, append_location, is_addition FROM llm_provider_config WHERE llm_provider_id = ?")?;
        let llm_provider_configs = stmt.query_map([llm_provider_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?;

        let mut result = Vec::new();
        for llm_provider_config in llm_provider_configs {
            result.push(llm_provider_config?);
        }
        Ok(result)
    }

    pub fn update_llm_provider_config(&self, llm_provider_id: i64, name: &str, value: &str) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO llm_provider_config (id, name, llm_provider_id, value) VALUES ((SELECT id FROM llm_provider_config WHERE llm_provider_id = ? AND name = ?), ?, ?, ?)",
            params![llm_provider_id, name, name, llm_provider_id, value],
        )?;
        Ok(())
    }

    pub fn add_llm_model(&self, name: &str, llm_provider_id: i64, code: &str, description: &str, vision_support: bool, audio_support: bool, video_support: bool) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO llm_model (name, llm_provider_id, code, description, vision_support, audio_support, video_support) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![name, llm_provider_id, code, description, vision_support, audio_support, video_support],
        )?;
        Ok(())
    }

    pub fn get_all_llm_models(&self) -> rusqlite::Result<Vec<(i64, String, i64, String, String, bool, bool, bool)>> {
        let mut stmt = self.conn.prepare("SELECT id, name, llm_provider_id, code, description, vision_support, audio_support, video_support FROM llm_model")?;
        let llm_models = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
            ))
        })?;

        let mut result = Vec::new();
        for llm_model in llm_models {
            result.push(llm_model?);
        }
        Ok(result)
    }

    pub fn get_llm_models(&self, provider_id: String) -> rusqlite::Result<Vec<(i64, String, i64, String, String, bool, bool, bool)>> {
        let mut stmt = self.conn.prepare("SELECT id, name, llm_provider_id, code, description, vision_support, audio_support, video_support FROM llm_model WHERE llm_provider_id = ?")?;
        let llm_models = stmt.query_map([provider_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
            ))
        })?;

        let mut result = Vec::new();
        for llm_model in llm_models {
            result.push(llm_model?);
        }
        Ok(result)
    }

    pub fn delete_llm_model(&self, id: i64) -> rusqlite::Result<()> {
        self.conn.execute(
            "DELETE FROM llm_model WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn delete_llm_model_by_provider(&self, provider_id: i64) -> rusqlite::Result<()> {
        self.conn.execute(
            "DELETE FROM llm_model WHERE llm_provider_id = ?",
            params![provider_id],
        )?;
        Ok(())
    }

    pub fn init_llm_provider(&self) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO llm_provider (id, name, api_type, description, is_official) VALUES (1, 'OpenAI', 'openai_api', 'OpenAI API', 1)",
            [],
        )?;
        self.conn.execute(
            "INSERT INTO llm_provider (id, name, api_type, description, is_official) VALUES (10, 'Ollama', 'ollama', 'Ollama API', 1)",
            [],
        )?;
        Ok(())
    }

    pub fn debug(&self) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO llm_model (id, name, llm_provider_id, code, description, vision_support, audio_support, video_support) VALUES (9999, 'yi:9b-v1.5', 10, 'yi:9b-v1.5', 'yi:9b-v1.5', 0, 0, 0)",
            [],
        )?;

        Ok(())
    }
}