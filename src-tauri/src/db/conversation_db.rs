use std::collections::HashSet;

use rusqlite::{Connection, Result, OptionalExtension};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: i64,
    pub name: String,
    pub assistant_id: Option<i64>,  // Assuming it can be NULL
    pub created_time: DateTime<Utc>,
}

// Define the Message struct
#[derive(Debug, Serialize, Deserialize, Clone)]
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
    pub fn create(conn: &Connection, name: String, assistant_id: Option<i64>) -> Result<Self> {
        conn.execute("INSERT INTO conversation (name, assistant_id) VALUES (?1, ?2)", (&name, &assistant_id))?;
        let id = conn.last_insert_rowid();
        Ok(Conversation { id, name, assistant_id, created_time: Utc::now() })
    }

    pub fn read(conn: &Connection, id: i64) -> Result<Option<Self>> {
        conn.query_row("SELECT id, name, assistant_id, created_time FROM conversation WHERE id = ?", &[&id], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                name: row.get(1)?,
                assistant_id: row.get(2)?,
                created_time: row.get(3)?,
            })
        }).optional()
    }

    pub fn update(conn: &Connection, id: i64, name: String) -> Result<()> {
        conn.execute("UPDATE conversation SET name = ?1 WHERE id = ?2", (&name, &id))?;
        Ok(())
    }

    pub fn delete(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM conversation WHERE id = ?", &[&id])?;
        Ok(())
    }
}

impl Message {
    pub fn list_by_conversation_id(conn: &Connection, conversation_id: i64) -> Result<Vec<Self>> {
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

    pub fn create(conn: &Connection, conversation_id: i64, message_type: String, content: String, llm_model_id: Option<i64>, token_count: i32) -> Result<Self> {
        conn.execute("INSERT INTO message (conversation_id, message_type, content, llm_model_id, token_count) VALUES (?1, ?2, ?3, ?4, ?5)", (&conversation_id, &message_type, &content, &llm_model_id, &token_count))?;
        let id = conn.last_insert_rowid();
        Ok(Message { id, conversation_id, message_type, content, llm_model_id, created_time: Utc::now(), token_count })
    }

    pub fn read(conn: &Connection, id: i64) -> Result<Option<Self>> {
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

    pub fn update(conn: &Connection, id: i64, conversation_id: i64, content: String, token_count: i32) -> Result<()> {
        conn.execute("UPDATE message SET conversation_id = ?1, content = ?2, token_count = ?3 WHERE id = ?4", (&conversation_id, &content, &token_count, &id))?;
        Ok(())
    }

    pub fn delete(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM message WHERE id = ?", &[&id])?;
        Ok(())
    }
}


pub struct ConversationDatabase {
    pub conn: Connection,
}

impl ConversationDatabase {
    pub fn new() -> rusqlite::Result<Self> {
        let conn = Connection::open("./conversation.db")?;
        Ok(ConversationDatabase { conn })
    }

    pub fn create_table(&self) -> rusqlite::Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS conversation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                assistant_id INTEGER,
                created_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS message (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                message_type TEXT NOT NULL,
                content TEXT NOT NULL,
                llm_model_id INTEGER,
                created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                token_count INTEGER
            )",
            [],
        )?;

        Ok(())
    }

    pub fn list_conversations(&self, page: u32, per_page: u32) -> Result<Vec<Conversation>> {
        let offset = (page - 1) * per_page;
        let mut stmt = self.conn.prepare(
            "SELECT id, name, assistant_id, created_time 
             FROM conversation 
             ORDER BY created_time DESC 
             LIMIT ?1 OFFSET ?2"
        )?;
        let rows = stmt.query_map(&[&per_page, &offset], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                name: row.get(1)?,
                assistant_id: row.get(2)?,
                created_time: row.get(3)?,
            })
        })?;
        let conversations: Result<Vec<_>> = rows.collect();
        conversations
    }

    pub fn get_conversation_with_messages(&self, conversation_id: i64) -> Result<(Conversation, Vec<Message>)> {
        let conversation = Conversation::read(&self.conn, conversation_id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        let messages = Message::list_by_conversation_id(&self.conn, conversation_id)?;
        Ok((conversation, messages))
    }

    pub fn update_conversation_name(&self, conversation_id: i64, name: String) -> Result<()> {
        Conversation::update(&self.conn, conversation_id, name)?;
        Ok(())
    }

    pub fn delete_conversation(&self, conversation_id: i64) -> Result<()> {
        Conversation::delete(&self.conn, conversation_id)?;
        Ok(())
    }

    pub fn update_conversation_assistant_id(&self, origin_assistant_id: i64, assistant_id: Option<i64>) -> Result<()> {
        self.conn.execute("UPDATE conversation SET assistant_id = ?1 WHERE assistant_id = ?2", (&assistant_id, &origin_assistant_id))?;
        Ok(())
    }
}