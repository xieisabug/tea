use serde::{Deserialize, Serialize};
use crate::db::llm_db::LLMDatabase;

#[derive(Serialize, Deserialize)]
pub struct LlmProvider {
    id: i64,
    name: String,
    api_type: String,
    description: String,
    is_official: bool,
}

#[derive(Serialize, Deserialize)]
pub struct LlmModel {
    id: i64,
    name: String,
    llm_provider_id: i64,
    code: String,
    description: String,
    vision_support: bool,
    audio_support: bool,
    video_support: bool,
}

#[tauri::command]
pub async fn get_llm_providers() -> Result<Vec<LlmProvider>, String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    let providers = db.get_llm_providers().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for (id, name, api_type, description, is_official) in providers {
        result.push(LlmProvider {
            id,
            name,
            api_type,
            description,
            is_official,
        });
    }
    Ok(result)
}


#[tauri::command]
pub async fn get_llm_models(provider_id: String) -> Result<Vec<LlmModel>, String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    let models = db.get_llm_models(provider_id).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for (id, name, llm_provider_id, code, description, vision_support, audio_support, video_support) in models {
        result.push(LlmModel {
            id,
            name,
            llm_provider_id,
            code,
            description,
            vision_support,
            audio_support,
            video_support,
        });
    }
    Ok(result)
}
