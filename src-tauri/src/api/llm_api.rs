use crate::{LlmModel, LlmProvider};
use crate::db::llm_db::LLMDatabase;

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
