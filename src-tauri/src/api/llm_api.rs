use serde::{Deserialize, Serialize};
use crate::api::llm::ollama::models as ollama_models;
use crate::api::llm::openai::models as openai_models;
use crate::db::llm_db::LLMDatabase;

#[derive(Serialize, Deserialize)]
pub struct LlmProvider {
    pub id: i64,
    pub name: String,
    pub api_type: String,
    pub description: String,
    pub is_official: bool,
    pub is_enabled: bool,
}

#[derive(Serialize, Deserialize)]
pub struct LlmModel {
    pub id: i64,
    pub name: String,
    pub llm_provider_id: i64,
    pub code: String,
    pub description: String,
    pub vision_support: bool,
    pub audio_support: bool,
    pub video_support: bool,
}

#[derive(Serialize, Deserialize)]
pub struct LlmProviderConfig {
    pub id: i64,
    pub name: String,
    pub llm_provider_id: i64,
    pub value: String,
    pub append_location: Option<String>,
    pub is_addition: Option<bool>,
}

#[tauri::command]
pub async fn get_llm_providers() -> Result<Vec<LlmProvider>, String> {
    let db = LLMDatabase::new().map_err(|e: rusqlite::Error| e.to_string())?;
    let providers = db.get_llm_providers().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for (id, name, api_type, description, is_official, is_enabled) in providers {
        result.push(LlmProvider {
            id,
            name,
            api_type,
            description,
            is_official,
            is_enabled
        });
    }
    Ok(result)
}

#[tauri::command]
pub async fn update_llm_provider(id: i64, name: String, api_type: String, description: String, is_enabled: bool) -> Result<(), String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    db.update_llm_provider(id, &*name, &*api_type, &*description, is_enabled).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_llm_provider_config(id: i64) -> Result<Vec<LlmProviderConfig>, String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    let configs = db.get_llm_provider_config(id).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for config in configs {
        result.push(LlmProviderConfig {
            id: config.id,
            name: config.name,
            llm_provider_id: config.llm_provider_id,
            value: config.value,
            append_location: Some(config.append_location),
            is_addition: Some(config.is_addition),
        });
    }
    Ok(result)
}

#[tauri::command]
pub async fn update_llm_provider_config(llm_provider_id: i64, name: String, value: String) -> Result<(), String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    db.update_llm_provider_config(llm_provider_id, &*name, &*value).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_llm_models(llm_provider_id: String) -> Result<Vec<LlmModel>, String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    let models = db.get_llm_models(llm_provider_id).map_err(|e| e.to_string())?;
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

#[tauri::command]
pub async fn fetch_model_list(llm_provider_id: i64) -> Result<Vec<LlmModel>, String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    let llm_provider = db.get_llm_provider(llm_provider_id).map_err(|e| e.to_string())?;
    let llm_provider_config = db.get_llm_provider_config(llm_provider_id).map_err(|e| e.to_string())?;

    println!("llm_provider: {:?}", llm_provider);
    match llm_provider.api_type.as_str() {
        "openai" => {
            let models = openai_models()?;
            let mut result = Vec::new();
            // for model in models {
            //     result.push(LlmModel {
            //         id: model.id,
            //         name: model.name,
            //         llm_provider_id: llm_provider_id,
            //         code: model.code,
            //         description: model.description,
            //         vision_support: model.vision_support,
            //         audio_support: model.audio_support,
            //         video_support: model.video_support,
            //     });
            // }
            Ok(result)
        },
        "ollama" => {
            let models = ollama_models(llm_provider_config).await.map_err(|e| e.to_string())?;
            db.delete_llm_model_by_provider(llm_provider_id).map_err(|e| e.to_string())?;
            let mut result = Vec::new();
            for model in models {
                let name_clone = model.name.clone(); // 克隆 description
                let code_clone = model.code.clone(); // 克隆 description
                let description_clone = model.description.clone(); // 克隆 description
                result.push(LlmModel {
                    id: model.id,
                    name: model.name,
                    llm_provider_id: llm_provider_id,
                    code: model.code,
                    description: model.description,
                    vision_support: model.vision_support,
                    audio_support: model.audio_support,
                    video_support: model.video_support,
                });
                db.add_llm_model(name_clone.as_str(), llm_provider_id, code_clone.as_str(), description_clone.as_str(), model.vision_support, model.audio_support, model.video_support).map_err(|e| e.to_string())?;
            }
            Ok(result)
        },
        _ => { Ok (Vec::new())}
    }
}

#[derive(Serialize, Deserialize)]
pub struct ModelForSelect {
    name: String,
    code: String,
    id: i64,
    llm_provider_id: i64,
}

#[tauri::command]
pub fn get_models_for_select() -> Result<Vec<ModelForSelect>, String> {
    let db = LLMDatabase::new().map_err(|e| e.to_string())?;
    let result = db.get_models_for_select().unwrap();
    let models = result.iter().map(|(name, code, id, llm_provider_id)| {
        ModelForSelect {
            name: name.clone(),
            code: code.clone(),
            id: *id,
            llm_provider_id: *llm_provider_id,
        }
    }).collect();
    Ok(models)
}