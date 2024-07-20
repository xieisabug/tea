use tauri::State;

use crate::db::conversation_db::{ConversationDatabase, Conversation, Message};

#[tauri::command]
pub fn list_conversations(
    page: u32,
    page_size: u32,
) -> Result<Vec<Conversation>, String> {
    let db = ConversationDatabase::new().map_err(|e| e.to_string())?;

    db.list_conversations(page, page_size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_conversation_with_messages(
    conversation_id: i64,
) -> Result<(Conversation, Vec<Message>), String> {
    let db = ConversationDatabase::new().map_err(|e| e.to_string())?;
    db.get_conversation_with_messages(conversation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_conversation(conversation_id: i64) -> Result<(), String> {
    let db = ConversationDatabase::new().map_err(|e| e.to_string())?;
    db.delete_conversation(conversation_id)
        .map_err(|e| e.to_string())
}