use rusqlite::{Connection, Result, OptionalExtension};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};

use super::get_db_path;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum AttachmentType {
    Image = 1,
    Text = 2,
    PDF = 3,
    Word = 4,
    PowerPoint = 5,
    Excel = 6,
}

impl TryFrom<i64> for AttachmentType {
    type Error = rusqlite::Error;

    fn try_from(value: i64) -> std::result::Result<Self, Self::Error> {
        match value {
            1 => Ok(AttachmentType::Image),
            2 => Ok(AttachmentType::Text),
            3 => Ok(AttachmentType::PDF),
            4 => Ok(AttachmentType::Word),
            5 => Ok(AttachmentType::PowerPoint),
            6 => Ok(AttachmentType::Excel),
            _ => Err(rusqlite::Error::FromSqlConversionFailure(
                2,
                rusqlite::types::Type::Integer,
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Invalid attachment type: {}", value),
                )),
            )),
        }
    }
}
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

// Define the Message struct
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageDetail {
    pub id: i64,
    pub conversation_id: i64,
    pub message_type: String,
    pub content: String,
    pub llm_model_id: Option<i64>,  // Assuming it can be NULL
    pub created_time: DateTime<Utc>,
    pub token_count: i32,
    pub attachment_list: Vec<MessageAttachment>,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageAttachment {
    pub id: i64,
    pub message_id: i64,
    pub attachment_type: AttachmentType,
    pub attachment_url: Option<String>,
    pub attachment_content: Option<String>,
    pub use_vector: bool,
    pub token_count: Option<i32>,
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
    pub fn list_by_conversation_id(conn: &Connection, conversation_id: i64) -> Result<Vec<(Message, Option<MessageAttachment>)>> {
        let mut stmt = conn.prepare("SELECT message.*, ma.attachment_type, ma.attachment_url, ma.attachment_content, ma.use_vector as attachment_use_vector, ma.token_count as attachment_token_count
                                                    FROM message
                                                        LEFT JOIN message_attachment ma on message.id = ma.message_id
                                                    WHERE conversation_id =  ?1")?;
        let rows = stmt.query_map(&[&conversation_id], |row| {
            let attachment_type_int: Option<i64> = row.get(7).ok();
            let attachment_type = attachment_type_int.map(AttachmentType::try_from).transpose()?;
            let message = Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                message_type: row.get(2)?,
                content: row.get(3)?,
                llm_model_id: row.get(4)?,
                created_time: row.get(5)?,
                token_count: row.get(6)?,
            };
            let attachment = if attachment_type.is_some() {
                Some(MessageAttachment {
                    id: 0,
                    message_id: row.get(0)?,
                    attachment_type: attachment_type.unwrap(),
                    attachment_url: row.get(8)?,
                    attachment_content: row.get(9)?,
                    use_vector: row.get(10)?,
                    token_count: row.get(11)?,
                })
            } else {
                None
            };
            Ok((message, attachment))
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
    pub fn new(app_handle: &tauri::AppHandle) -> rusqlite::Result<Self> {
        let db_path = get_db_path(app_handle, "conversation.db");
        let conn = Connection::open(db_path.unwrap())?;
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
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS message_attachment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER,
                attachment_type INTEGER NOT NULL,
                attachment_url TEXT,
                attachment_content TEXT,
                use_vector BOOLEAN NOT NULL DEFAULT 0,
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

    pub fn get_conversation_with_messages(&self, conversation_id: i64) -> Result<(Conversation, Vec<(Message, Option<MessageAttachment>)>)> {
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

impl MessageAttachment {
    pub fn create(conn: &Connection, message_id: i64, attachment_type: AttachmentType, attachment_url: Option<String>, attachment_content: Option<String>, use_vector: bool, token_count: Option<i32>) -> Result<Self> {
        conn.execute(
            "INSERT INTO message_attachment (message_id, attachment_type, attachment_url, attachment_content, use_vector, token_count) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (&message_id, &(attachment_type as i64), &attachment_url, &attachment_content, &use_vector, &token_count),
        )?;
        let id = conn.last_insert_rowid();
        Ok(MessageAttachment { id, message_id, attachment_type, attachment_url, attachment_content, use_vector, token_count })
    }

    pub fn read(conn: &Connection, id: i64) -> Result<Option<Self>> {
        conn.query_row(
            "SELECT * FROM message_attachment WHERE id = ?",
            &[&id],
            |row| {
                let attachment_type_int: i64 = row.get(2)?;
                let attachment_type = AttachmentType::try_from(attachment_type_int)?;
                Ok(MessageAttachment {
                    id: row.get(0)?,
                    message_id: row.get(1)?,
                    attachment_type,
                    attachment_url: row.get(3)?,
                    attachment_content: row.get(4)?,
                    use_vector: row.get(5)?,
                    token_count: row.get(6)?,
                })
            },
        ).optional()
    }

    pub fn update(conn: &Connection, id: i64, message_id: i64) -> Result<()> {
        conn.execute(
            "UPDATE message_attachment SET message_id = ?1 WHERE id = ?2",
            (message_id, id),
        )?;
        Ok(())
    }

    pub fn delete(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM message_attachment WHERE id = ?", &[&id])?;
        Ok(())
    }

    pub fn list_by_id(conn: &Connection, id_list: &Vec<i64>) -> Result<Vec<Self>> {
        let id_list_str: Vec<String> = id_list.iter().map(|id| id.to_string()).collect();
        let id_list_str = id_list_str.join(",");
        let query = format!("SELECT * FROM message_attachment WHERE id IN ({})", id_list_str);
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], |row| {
            let attachment_type_int: i64 = row.get(2)?;
            let attachment_type = AttachmentType::try_from(attachment_type_int)?;
            Ok(MessageAttachment {
                id: row.get(0)?,
                message_id: row.get(1)?,
                attachment_type,
                attachment_url: row.get(3)?,
                attachment_content: row.get(4)?,
                use_vector: row.get(5)?,
                token_count: row.get(6)?,
            })
        })?;
        let attachments = rows.collect::<Result<Vec<_>>>()?;
        Ok(attachments)
    }
}