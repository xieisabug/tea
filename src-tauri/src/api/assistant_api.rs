use crate::db::assistant_db::{Assistant, AssistantDatabase};

#[tauri::command]
pub fn get_assistants() -> Result<Vec<Assistant>, String> {
    let assistant_db = AssistantDatabase::new().map_err(|e| e.to_string())?;
    assistant_db.get_assistants()
        .map(|assistants| assistants.into())
        .map_err(|e| e.to_string())

}