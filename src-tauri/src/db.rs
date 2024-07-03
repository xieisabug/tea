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
            "CREATE TABLE IF NOT EXISTS llm (name TEXT NOT NULL PRIMARY KEY, api_type TEXT NOT NULL)",
            [],
        )?;
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
}
