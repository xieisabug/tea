use rusqlite::{Connection, Result, params};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let conn = Connection::open("./dev.db")?;
        Ok(Database { conn })
    }

    pub fn create_table(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS llm_provider (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    api_type TEXT NOT NULL,
                    description TEXT,
                    is_official BOOLEAN NOT NULL DEFAULT 0,
                    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
                );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS system_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL UNIQUE,
                    value TEXT NOT NULL,
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

        let system_version = self.get_config("system_version")?;
        if system_version.is_empty() {
            self.conn.execute(
                "INSERT INTO system_config (key, value) VALUES ('system_version', '0.1')",
                [],
            )?;

            self.init_llm_provider()?;
            self.debug()?;
        } else {
            // TODO 以后的升级逻辑都放到这里
            println!("system_version: {}", system_version);
        }
        Ok(())
    }

    pub fn add_llm_provider(&self, name: &str, api_type: &str, description: &str, is_official: bool) -> Result<()> {
        self.conn.execute(
            "INSERT INTO llm_provider (name, api_type, description, is_official) VALUES (?, ?, ?, ?)",
            params![name, api_type, description, is_official],
        )?;
        Ok(())
    }

    pub fn get_llm_providers(&self) -> Result<Vec<(i64, String, String, String, bool)>> {
        let mut stmt = self.conn.prepare("SELECT id, name, api_type, description, is_official FROM llm_provider")?;
        let llm_providers = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })?;

        let mut result = Vec::new();
        for llm_provider in llm_providers {
            result.push(llm_provider?);
        }
        Ok(result)
    }

    pub fn delete_llm_provider(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM llm_provider WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_system_config(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO system_config (key, value) VALUES (?, ?)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_config(&self, key: &str) -> Result<String> {
        let mut stmt = self.conn.prepare("SELECT value FROM system_config WHERE key = ?")?;
        let mut rows = stmt.query_map(params![key], |row| {
            Ok(row.get(0)?)
        })?;

        if let Some(row) = rows.next() {
            let value = row?; // Handle potential error
            Ok(value)
        } else {
            Ok(String::new())
        }
    }

    pub fn delete_system_config(&self, key: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM system_config WHERE key = ?",
            params![key],
        )?;
        Ok(())
    }

    pub fn add_llm_model(&self, name: &str, llm_provider_id: i64, code: &str, description: &str, vision_support: bool, audio_support: bool, video_support: bool) -> Result<()> {
        self.conn.execute(
            "INSERT INTO llm_model (name, llm_provider_id, code, description, vision_support, audio_support, video_support) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![name, llm_provider_id, code, description, vision_support, audio_support, video_support],
        )?;
        Ok(())
    }

    pub fn get_all_llm_models(&self) -> Result<Vec<(i64, String, i64, String, String, bool, bool, bool)>> {
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

    pub fn get_llm_models(&self, provider_id: String) -> Result<Vec<(i64, String, i64, String, String, bool, bool, bool)>> {
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

    pub fn delete_llm_model(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM llm_model WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn init_llm_provider(&self) -> Result<()> {
        self.conn.execute(
            "INSERT INTO llm_provider (id, name, api_type, description, is_official) VALUES (1, 'OpenAI', 'openai_api', 'OpenAI API', 1)",
            [],
        )?;
        self.conn.execute(
            "INSERT INTO llm_provider (id, name, api_type, description, is_official) VALUES (10, 'Ollama', 'openai_api', 'Ollama API', 1)",
            [],
        )?;
        Ok(())
    }

    pub fn debug(&self) -> Result<()> {
        self.conn.execute(
            "INSERT INTO llm_model (id, name, llm_provider_id, code, description, vision_support, audio_support, video_support) VALUES (9999, 'yi:9b-v1.5', 10, 'yi:9b-v1.5', 'yi:9b-v1.5', 0, 0, 0)",
            [],
        )?;

        Ok(())
    }
}