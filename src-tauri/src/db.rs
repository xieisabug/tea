// src-tauri/src/database.rs
use rusqlite::{Connection, Result};

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

    pub fn add_llm(&self, name: &str, api_type: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO llm (name, api_type) VALUES (?, ?)",
            &[name, api_type],
        )?;
        Ok(())
    }

    pub fn get_llm(&self) -> Result<Vec<(String, String)>> {
        let mut stmt = self.conn.prepare("SELECT name, api_type FROM llm")?;
        let llms = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut result = Vec::new();
        for llm in llms {
            result.push(llm?);
        }
        Ok(result)
    }

    pub fn get_config(&self, key: &str) -> Result<String> {
        let mut stmt = self.conn.prepare("SELECT value FROM system_config WHERE key = ?")?;
        let mut rows = stmt.query_map(&[key], |row| {
            Ok(row.get(0)?)
        })?;

        if let Some(row) = rows.next() {
            let value = row?; // Handle potential error
            Ok(value)
        } else {
            Ok(String::new())
        }
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
