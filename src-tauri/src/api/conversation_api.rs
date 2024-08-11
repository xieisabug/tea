use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

use crate::{db::conversation_db::{Conversation, ConversationDatabase, Message}, errors::AppError, NameCacheState};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationResult {
    pub id: i64,
    pub name: String,
    pub assistant_id: i64,
    pub assistant_name: String,
    pub created_time: DateTime<Utc>,
}

#[tauri::command]
pub async fn list_conversations(
    app_handle: tauri::AppHandle,
    name_cache_state: tauri::State<'_, NameCacheState>,
    page: u32,
    page_size: u32,
) -> Result<Vec<ConversationResult>, AppError> {
    let db = ConversationDatabase::new(&app_handle).map_err(AppError::from)?;

    let conversations = db.list_conversations(page, page_size)
        .map_err(|e| e.to_string());

    let mut conversation_results = Vec::new();
    let assistant_name_cache = name_cache_state.assistant_names.lock().await.clone();
    if let Ok(conversations) = &conversations {
        for conversation in conversations {
            let assistant_name = assistant_name_cache.get(&conversation.assistant_id.unwrap());
            conversation_results.push(ConversationResult {
                id: conversation.id,
                name: conversation.name.clone(),
                assistant_id: conversation.assistant_id.unwrap_or(0),
                assistant_name: assistant_name.unwrap_or(&"未知".to_string()).clone(),
                created_time: conversation.created_time,
            });
        }
    }
    Ok(conversation_results)
}

#[tauri::command]
pub async fn get_conversation_with_messages(
    app_handle: tauri::AppHandle,
    name_cache_state: tauri::State<'_, NameCacheState>,
    conversation_id: i64,
) -> Result<(ConversationResult, Vec<Message>), String> {
    let db = ConversationDatabase::new(&app_handle).map_err(|e| e.to_string())?;
    let conversation_with_message = db.get_conversation_with_messages(conversation_id)
        .map_err(|e| e.to_string());
    let assistant_name_cache = name_cache_state.assistant_names.lock().await.clone();
    let assistant_name = assistant_name_cache.get(&conversation_with_message.clone().unwrap().0.assistant_id.unwrap());
    let assistant_name = assistant_name.unwrap_or(&"未知".to_string()).clone();
    let conversation_with_message_result = conversation_with_message.map(|(conversation, messages)| {
        (ConversationResult {
            id: conversation.id,
            name: conversation.name,
            assistant_id: conversation.assistant_id.unwrap_or(0),
            assistant_name,
            created_time: conversation.created_time,
        }, messages)
    });
    
    return conversation_with_message_result
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