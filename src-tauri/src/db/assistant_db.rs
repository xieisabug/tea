use rusqlite::{Connection, params};

#[derive(Debug)]
pub struct Assistant {
    id: i32,
    name: String,
    description: Option<String>,
    llm_model_id: Option<i32>,
    is_addition: bool,
    created_time: String,
}

#[derive(Debug)]
pub struct AssistantPrompt {
    id: i32,
    assistant_id: i32,
    prompt: String,
    created_time: String,
}

#[derive(Debug)]
pub struct AssistantModelConfig {
    id: i32,
    assistant_id: i32,
    name: String,
    value: Option<String>,
}

#[derive(Debug)]
pub struct AssistantPromptParam {
    id: i32,
    assistant_id: i32,
    assistant_prompt_id: i32,
    param_name: String,
    param_type: Option<String>,
    param_value: Option<String>,
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
                llm_model_id INTEGER,
                is_addition BOOLEAN NOT NULL DEFAULT 0,
                created_time DATETIME DEFAULT CURRENT_TIMESTAMP
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

        if let Err(err) = self.init_llm_provider() {
            println!("init_llm_provider error: {:?}", err);
        }
        Ok(())
    }

    pub fn add_assistant(&self, name: &str, description: &str, llm_model_id: Option<i32>, is_addition: bool) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO assistant (name, description, llm_model_id, is_addition) VALUES (?, ?, ?, ?)",
            params![name, description, llm_model_id, is_addition],
        )?;
        Ok(())
    }

    pub fn update_assistant(&self, id: i32, name: &str, description: &str, llm_model_id: Option<i32>, is_addition: bool) -> Result<(), String> {
        self.conn.execute(
            "UPDATE assistant SET name = ?, description = ?, llm_model_id = ?, is_addition = ? WHERE id = ?",
            params![name, description, llm_model_id, is_addition, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant(&self, id: i32) -> Result<(), String> {
        self.conn.execute(
            "DELETE FROM assistant WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_assistant_prompt(&self, assistant_id: i32, prompt: &str) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO assistant_prompt (assistant_id, prompt) VALUES (?, ?)",
            params![assistant_id, prompt],
        )?;
        Ok(())
    }

    pub fn update_assistant_prompt(&self, id: i32, prompt: &str) -> Result<(), String> {
        self.conn.execute(
            "UPDATE assistant_prompt SET prompt = ? WHERE id = ?",
            params![prompt, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant_prompt(&self, id: i32) -> Result<(), String> {
        self.conn.execute(
            "DELETE FROM assistant_prompt WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_assistant_model_config(&self, assistant_id: i32, name: &str, value: &str) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO assistant_model_config (assistant_id, name, value) VALUES (?, ?, ?)",
            params![assistant_id, name, value],
        )?;
        Ok(())
    }

    pub fn update_assistant_model_config(&self, id: i32, name: &str, value: &str) -> Result<(), String> {
        self.conn.execute(
            "UPDATE assistant_model_config SET name = ?, value = ? WHERE id = ?",
            params![name, value, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant_model_config(&self, id: i32) -> Result<(), String> {
        self.conn.execute(
            "DELETE FROM assistant_model_config WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn add_assistant_prompt_param(&self, assistant_id: i32, assistant_prompt_id: i32, param_name: &str, param_type: &str, param_value: &str) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO assistant_prompt_param (assistant_id, assistant_prompt_id, param_name, param_type, param_value) VALUES (?, ?, ?, ?, ?)",
            params![assistant_id, assistant_prompt_id, param_name, param_type, param_value],
        )?;
        Ok(())
    }

    pub fn update_assistant_prompt_param(&self, id: i32, param_name: &str, param_type: &str, param_value: &str) -> Result<(), String> {
        self.conn.execute(
            "UPDATE assistant_prompt_param SET param_name = ?, param_type = ?, param_value = ? WHERE id = ?",
            params![param_name, param_type, param_value, id],
        )?;
        Ok(())
    }

    pub fn delete_assistant_prompt_param(&self, id: i32) -> Result<(), String> {
        self.conn.execute(
            "DELETE FROM assistant_prompt_param WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_assistants(&self) -> Result<Vec<Assistant>, String> {
        let mut stmt = self.conn.prepare("SELECT id, name, description, llm_model_id, is_addition, created_time FROM assistant")?;
        let assistant_iter = stmt.query_map(params![], |row| {
            Ok(Assistant {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                llm_model_id: row.get(3)?,
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

    pub fn get_assistant_prompts(&self) -> Result<Vec<AssistantPrompt>, String> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, prompt, created_time FROM assistant_prompt")?;
        let assistant_prompt_iter = stmt.query_map(params![], |row| {
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

    pub fn get_assistant_model_configs(&self) -> Result<Vec<AssistantModelConfig>, String> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, name, value FROM assistant_model_config")?;
        let assistant_model_config_iter = stmt.query_map(params![], |row| {
            Ok(AssistantModelConfig {
                id: row.get(0)?,
                assistant_id: row.get(1)?,
                name: row.get(2)?,
                value: row.get(3)?,
            })
        })?;

        let mut assistant_model_configs = Vec::new();
        for assistant_model_config in assistant_model_config_iter {
            assistant_model_configs.push(assistant_model_config?);
        }
        Ok(assistant_model_configs)
    }

    pub fn get_assistant_prompt_params(&self) -> Result<Vec<AssistantPromptParam>, String> {
        let mut stmt = self.conn.prepare("SELECT id, assistant_id, assistant_prompt_id, param_name, param_type, param_value FROM assistant_prompt_param")?;
        let assistant_prompt_param_iter = stmt.query_map(params![], |row| {
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
    pub fn init_assistant(&self) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO assistant (id, name, description, llm_model_id, is_addition) VALUES (1, '快速使用助手', '快捷键呼出的快速使用助手', -1, 0)",
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