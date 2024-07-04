use rusqlite::{Connection, Result, params};

pub struct SystemDatabase {
    conn: Connection,
}

impl SystemDatabase {
    pub fn new() -> Result<Self> {
        let conn = Connection::open("./dev.db")?;
        Ok(SystemDatabase { conn })
    }

    pub fn create_table(&self) -> Result<()> {

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS system_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL UNIQUE,
                    value TEXT NOT NULL,
                    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
                );",
            [],
        )?;

        let system_version = self.get_config("system_version")?;
        if system_version.is_empty() {
            self.conn.execute(
                "INSERT INTO system_config (key, value) VALUES ('system_version', '0.1')",
                [],
            )?;

        } else {
            // TODO 以后的升级逻辑都放到这里
            println!("system_version: {}", system_version);
        }
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

}