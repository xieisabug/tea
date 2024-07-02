// src-tauri/src/database.rs
use duckdb::{Connection, Result};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Ok(Database { conn })
    }

    pub fn create_table(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS llm (name TEXT NOT NULL PRIMARY KEY, api_type TEXT NOT NULL)",
            [],
        )?;
        Ok(())
    }

    pub fn add_user(&self, name: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO users (name) VALUES (?)",
            &[name],
        )?;
        Ok(())
    }

    pub fn get_users(&self) -> Result<Vec<(i32, String)>> {
        let mut stmt = self.conn.prepare("SELECT id, name FROM users")?;
        let users = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut result = Vec::new();
        for user in users {
            result.push(user?);
        }
        Ok(result)
    }
}
