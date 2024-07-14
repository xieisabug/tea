use rusqlite::{Connection, params, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Assistant {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub assistant_type: Option<i64>, // 0: 普通对话助手, 1: 多模型对比助手，2: 工作流助手，3: 展示助手
    pub is_addition: bool,
    pub created_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssistantModel {
    pub id: i64,
    pub assistant_id: i64,
    pub model_id: String,
    pub alias: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssistantPrompt {
    pub id: i64,
    pub assistant_id: i64,
    pub prompt: String,
    pub created_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssistantModelConfig {
    pub id: i64,
    pub assistant_id: i64,
    pub assistant_model_id: i64,
    pub name: String,
    pub value: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssistantPromptParam {
    pub id: i64,
    pub assistant_id: i64,
    pub assistant_prompt_id: i64,
    pub param_name: String,
    pub param_type: Option<String>,
    pub param_value: Option<String>,
}

pub struct AssistantDatabase {
    conn: Connection,
}

impl AssistantDatabase {
    pub fn new() -> rusqlite::Result<Self> {
        let conn = Connection::open("./dev.db")?;
        Ok(AssistantDatabase { conn })
    }

    pub fn create_table(&self) -> rusqlite::Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS assistant (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                assistant_type INTEGER NOT NULL DEFAULT 0,
                is_addition BOOLEAN NOT NULL DEFAULT 0,
                created_time DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS assistant_model (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assistant_id INTEGER NOT NULL,
                model_id INTEGER NOT NULL,
                alias TEXT
            );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS assistant_prompt (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assistant_id INTEGER,
                prompt TEXT NOT NULL,
                created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assistant_id) REFERENCES assistant(id)
            );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS assistant_model_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assistant_id INTEGER,
                assistant_model_id INTEGER,
                name TEXT NOT NULL,
                value TEXT,
                FOREIGN KEY (assistant_id) REFERENCES assistant(id)
            );",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS assistant_prompt_param (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assistant_id INTEGER,
                assistant_prompt_id INTEGER,
                param_name TEXT NOT NULL,
                param_type TEXT,
                param_value TEXT,
                FOREIGN KEY (assistant_id) REFERENCES assistant(id),
                FOREIGN KEY (assistant_prompt_id) REFERENCES assistant_prompt(id)
            );",
            [],
        )?;

        if let Err(err) = self.init_assistant() {
            println!("init_assistant error: {:?}", err);
        }
        Ok(())
    }

    pub fn add_assistant(&self, name: &str, description: &str, assistant_type: Option<i64>, is_addition: bool) -> Result<()> {
        self.conn.execute(
            "INSERT INTO assistant (name, description, assistant_type, is_addition) VALUES (?, ?, ?, ?)",
            params![name, description, assistant_type, is_addition],
        )?;
        Ok(())
    }

    pub fn update_assistant(&self, id: i64, name: &str, description: &str, is_addition: bool) -> Result<()> {
        self.conn.execute(
            "UPDATE assistant SET name = ?, description = ?, is_addition = ? WHERE id = ?",
            params![name, description, is_addition, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM assistant WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_assistant_prompt(&self, assistant_id: i64, prompt: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO assistant_prompt (assistant_id, prompt) VALUES (?, ?)",
            params![assistant_id, prompt],
        )?;
        Ok(())
    }

    pub fn update_assistant_prompt(&self, id: i64, prompt: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE assistant_prompt SET prompt = ? WHERE id = ?",
            params![prompt, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant_prompt(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM assistant_prompt WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_assistant_model(&self, assistant_id: i64, model_id: &str, alias: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO assistant_model (assistant_id, model_id, alias) VALUES (?, ?, ?)",
            params![assistant_id, model_id, alias],
        )?;
        Ok(())
    }

    pub fn update_assistant_model(&self, id: i64, model_id: &str, alias: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE assistant_model SET model_id = ?, alias = ? WHERE id = ?",
            params![model_id, alias, id],
        )?;
        Ok(())
    }

    pub fn add_assistant_model_config(&self, assistant_id: i64, assistant_model_id: i64, name: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO assistant_model_config (assistant_id, assistant_model_id, name, value) VALUES (?, ?, ?, ?)",
            params![assistant_id, assistant_model_id, name, value],
        )?;
        Ok(())
    }

    pub fn update_assistant_model_config(&self, id: i64, name: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE assistant_model_config SET name = ?, value = ? WHERE id = ?",
            params![name, value, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant_model_config(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM assistant_model_config WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_assistant_prompt_param(&self, assistant_id: i64, assistant_prompt_id: i64, param_name: &str, param_type: &str, param_value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO assistant_prompt_param (assistant_id, assistant_prompt_id, param_name, param_type, param_value) VALUES (?, ?, ?, ?, ?)",
            params![assistant_id, assistant_prompt_id, param_name, param_type, param_value],
        )?;
        Ok(())
    }

    pub fn update_assistant_prompt_param(&self, id: i64, param_name: &str, param_type: &str, param_value: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE assistant_prompt_param SET param_name = ?, param_type = ?, param_value = ? WHERE id = ?",
            params![param_name, param_type, param_value, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant_prompt_param(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM assistant_prompt_param WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_assistants(&self) -> Result<Vec<Assistant>> {
        let mut stmt = self.conn.prepare("SELECT id, name, description, assistant_type, is_addition, created_time FROM assistant")?;
        let assistant_iter = stmt.query_map(params![], |row| {
            Ok(Assistant {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                assistant_type: row.get(3)?,
                is_addition: row.get(4)?,
                created_time: row.get(5)?,
            })
        })?;

        let mut assistants = Vec::new();
        for assistant in assistant_iter {
            assistants.push(assistant?);
        }
        Ok(assistants)
    }

    pub fn get_assistant(&self, assistant_id: i64) -> Result<Assistant> {
        let mut stmt = self.conn.prepare("SELECT id, name, description, assistant_type, is_addition, created_time FROM assistant WHERE id = ?")?;
        let mut assistant_iter = stmt.query_map(params![assistant_id], |row| {
            Ok(Assistant {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                assistant_type: row.get(3)?,
                is_addition: row.get(4)?,
                created_time: row.get(5)?,
            })
        })?;

        if let Some(assistant) = assistant_iter.next() {
            return Ok(assistant?);
        }

        Err(rusqlite::Error::QueryReturnedNoRows)
    }

    pub fn get_assistant_model(&self, assistant_id: i64) -> Result<Vec<AssistantModel>> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, model_id, alias FROM assistant_model WHERE assistant_id = ?")?;
        let assistant_model_iter = stmt.query_map(params![assistant_id], |row| {
            println!("row: {:?}", row);
            Ok(AssistantModel {
                id: row.get(0)?,
                assistant_id: row.get(1)?,
                model_id: row.get::<_, i64>(2)?.to_string(),
                alias: row.get(3)?,
            })
        })?;

        let mut assistant_models = Vec::new();
        for assistant_model in assistant_model_iter {
            assistant_models.push(assistant_model?);
        }
        Ok(assistant_models)
    }

    pub fn get_assistant_prompt(&self, assistant_id: i64) -> Result<Vec<AssistantPrompt>> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, prompt, created_time FROM assistant_prompt WHERE assistant_id = ?")?;
        let assistant_prompt_iter = stmt.query_map(params![assistant_id], |row| {
            Ok(AssistantPrompt {
                id: row.get(0)?,
                assistant_id: row.get(1)?,
                prompt: row.get(2)?,
                created_time: row.get(3)?,
            })
        })?;

        let mut assistant_prompts = Vec::new();
        for assistant_prompt in assistant_prompt_iter {
            assistant_prompts.push(assistant_prompt?);
        }
        Ok(assistant_prompts)
    }

    pub fn get_assistant_model_configs(&self, assistant_id: i64) -> Result<Vec<AssistantModelConfig>> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, assistant_model_id, name, value FROM assistant_model_config WHERE assistant_id = ? AND assistant_model_id = -1")?;
        let assistant_model_config_iter = stmt.query_map(params![assistant_id], |row| {
            Ok(AssistantModelConfig {
                id: row.get(0)?,
                assistant_id: row.get(1)?,
                assistant_model_id: row.get(2)?,
                name: row.get(3)?,
                value: row.get(4)?,
            })
        })?;

        let mut assistant_model_configs = Vec::new();
        for assistant_model_config in assistant_model_config_iter {
            assistant_model_configs.push(assistant_model_config?);
        }
        Ok(assistant_model_configs)
    }

    pub fn get_assistant_prompt_params(&self, assistant_id: i64) -> Result<Vec<AssistantPromptParam>> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, assistant_prompt_id, param_name, param_type, param_value FROM assistant_prompt_param WHERE assistant_id = ?")?;
        let assistant_prompt_param_iter = stmt.query_map(params![assistant_id], |row| {
            Ok(AssistantPromptParam {
                id: row.get(0)?,
                assistant_id: row.get(1)?,
                assistant_prompt_id: row.get(2)?,
                param_name: row.get(3)?,
                param_type: row.get(4)?,
                param_value: row.get(5)?,
            })
        })?;

        let mut assistant_prompt_params = Vec::new();
        for assistant_prompt_param in assistant_prompt_param_iter {
            assistant_prompt_params.push(assistant_prompt_param?);
        }
        Ok(assistant_prompt_params)
    }

    pub fn init_assistant(&self) -> Result<()> {
        self.conn.execute(
            "INSERT INTO assistant (id, name, description, is_addition) VALUES (1, '快速使用助手', '快捷键呼出的快速使用助手', 0)",
            [],
        )?;
        self.add_assistant_prompt(1, "You are a helpful assistant.")?;
        self.add_assistant_model_config(1, -1, "max_tokens", "1000")?;
        self.add_assistant_model_config(1, -1, "temperature", "0.75")?;
        self.add_assistant_model_config(1, -1, "top_p", "1.0")?;
        self.add_assistant_model_config(1, -1, "stream", "false")?;
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