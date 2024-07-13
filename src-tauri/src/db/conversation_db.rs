use rusqlite::{Connection, Result, OptionalExtension};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Conversation {
    pub id: i64,
    pub name: String,
    pub assistant_id: Option<i64>,  // Assuming it can be NULL
    pub created_time: DateTime<Utc>,
}

// Define the Message struct
#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: i64,
    pub conversation_id: i64,
    pub message_type: String,
    pub content: String,
    pub llm_model_id: Option<i64>,  // Assuming it can be NULL
    pub created_time: DateTime<Utc>,
    pub token_count: i32,
}

impl Conversation {
    fn create(conn: &Connection, name: String, assistant_id: Option<i64>) -> Result<Self> {
        conn.execute("INSERT INTO conversation (name, assistant_id) VALUES (?1, ?2)", (&name, &assistant_id))?;
        let id = conn.last_insert_rowid();
        Ok(Conversation { id, name, assistant_id, created_time: Utc::now() })
    }

    fn read(conn: &Connection, id: i64) -> Result<Option<Self>> {
        conn.query_row("SELECT id, name, assistant_id, created_time FROM conversation WHERE id = ?", &[&id], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                name: row.get(1)?,
                assistant_id: row.get(2)?,
                created_time: row.get(3)?,
            })
        }).optional()
    }

    fn update(conn: &Connection, id: i64, name: String, assistant_id: Option<i64>) -> Result<()> {
        conn.execute("UPDATE conversation SET name = ?1, assistant_id = ?2 WHERE id = ?3", (&name, &assistant_id, &id))?;
        Ok(())
    }

    fn delete(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM conversation WHERE id = ?", &[&id])?;
        Ok(())
    }
}

impl Message {
    fn list_by_conversation_id(conn: &Connection, conversation_id: i64) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare("SELECT * FROM message WHERE conversation_id = ?1")?;
        let rows = stmt.query_map(&[&conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                message_type: row.get(2)?,
                content: row.get(3)?,
                llm_model_id: row.get(4)?,
                created_time: row.get(5)?,
                token_count: row.get(6)?,
            })
        })?;
        let mut messages = Vec::new();
        for message in rows {
            messages.push(message?);
        }
        Ok(messages)
    }

    fn create(conn: &Connection, conversation_id: i64, message_type: String, content: String, llm_model_id: Option<i64>, token_count: i32) -> Result<Self> {
        conn.execute("INSERT INTO message (conversation_id, message_type, content, llm_model_id, token_count) VALUES (?1, ?2, ?3, ?4, ?5)", (&conversation_id, &message_type, &content, &llm_model_id, &token_count))?;
        let id = conn.last_insert_rowid();
        Ok(Message { id, conversation_id, message_type, content, llm_model_id, created_time: Utc::now(), token_count })
    }

    fn read(conn: &Connection, id: i64) -> Result<Option<Self>> {
        conn.query_row("SELECT * FROM message WHERE id = ?", &[&id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                message_type: row.get(2)?,
                content: row.get(3)?,
                llm_model_id: row.get(4)?,
                created_time: row.get(5)?,
                token_count: row.get(6)?,
            })
        }).optional()
    }

    fn update(conn: &Connection, id: i64, conversation_id: i64, message_type: String, content: String, llm_model_id: Option<i64>, token_count: i32) -> Result<()> {
        conn.execute("UPDATE message SET conversation_id = ?1, message_type = ?2, content = ?3, llm_model_id = ?4, token_count = ?5 WHERE id = ?6", (&conversation_id, &message_type, &content, &llm_model_id, &token_count, &id))?;
        Ok(())
    }

    fn delete(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM message WHERE id = ?", &[&id])?;
        Ok(())
    }
}