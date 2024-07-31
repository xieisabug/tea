use crate::db::conversation_db::{ConversationDatabase, Conversation, Message};

#[tauri::command]
pub fn list_conversations(
    app_handle: tauri::AppHandle,
    page: u32,
    page_size: u32,
) -> Result<Vec<Conversation>, String> {
    let db = ConversationDatabase::new(&app_handle).map_err(|e| e.to_string())?;

    db.list_conversations(page, page_size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_conversation_with_messages(
    app_handle: tauri::AppHandle,
    conversation_id: i64,
) -> Result<(Conversation, Vec<Message>), String> {
    let db = ConversationDatabase::new(&app_handle).map_err(|e| e.to_string())?;
    db.get_conversation_with_messages(conversation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_conversation(app_handle: tauri::AppHandle, conversation_id: i64) -> Result<(), String> {
    let db = ConversationDatabase::new(&app_handle).map_err(|e| e.to_string())?;
    db.delete_conversation(conversation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_conversation(app_handle: tauri::AppHandle, conversation_id: i64, name: String) -> Result<(), String> {
    let db = ConversationDatabase::new(&app_handle).map_err(|e| e.to_string())?;
    db.update_conversation_name(conversation_id, name)
        .map_err(|e| e.to_string())
}