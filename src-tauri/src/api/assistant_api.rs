use crate::db::assistant_db::{Assistant, AssistantDatabase, AssistantModel, AssistantModelConfig, AssistantPrompt, AssistantPromptParam};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct AssistantDetail {
    pub assistant: Assistant,
    pub prompts: Vec<AssistantPrompt>,
    pub model: Vec<AssistantModel>,
    pub model_configs: Vec<AssistantModelConfig>,
    pub prompt_params: Vec<AssistantPromptParam>,
}

#[tauri::command]
pub fn get_assistants() -> Result<Vec<Assistant>, String> {
    let assistant_db = AssistantDatabase::new().map_err(|e| e.to_string())?;
    assistant_db.get_assistants()
        .map(|assistants| assistants.into())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_assistant(assistant_id: i64) -> Result<AssistantDetail, String> {
    let assistant_db = AssistantDatabase::new().map_err(|e| e.to_string())?;

    // 获取 Assistant 基本信息
    let assistant = assistant_db.get_assistant(assistant_id).map_err(|e| e.to_string())?;
    println!("assistant: {:?}", assistant);

    // 获取相关的 prompt
    let prompts = assistant_db.get_assistant_prompt(assistant_id).map_err(|e| e.to_string())?;
    println!("prompts: {:?}", prompts);

    // 获取相关的 model
    let model = assistant_db.get_assistant_model(assistant_id).map_err(|e| e.to_string())?;
    println!("model: {:?}", model);

    // 获取相关的 model_config
    let model_configs = assistant_db.get_assistant_model_configs(assistant_id).map_err(|e| e.to_string())?;
    println!("model_configs: {:?}", model_configs);

    // 获取相关的 prompt_params
    let prompt_params = assistant_db.get_assistant_prompt_params(assistant_id).map_err(|e| e.to_string())?;
    println!("prompt_params: {:?}", prompt_params);
    
    // 构建 AssistantDetail 对象
    let assistant_detail = AssistantDetail {
        assistant,
        prompts,
        model,
        model_configs,
        prompt_params,
    };

    Ok(assistant_detail)
}

#[tauri::command]
pub fn save_assistant(assistant_detail: AssistantDetail) -> Result<(), String> {
    let assistant_db = AssistantDatabase::new().map_err(|e| e.to_string())?;

    // Save or update the Assistant
    if assistant_detail.assistant.id == 0 {
        assistant_db.add_assistant(
            &assistant_detail.assistant.name,
            assistant_detail.assistant.description.as_deref().unwrap_or(""),
            assistant_detail.assistant.assistant_type,
            assistant_detail.assistant.is_addition,
        ).map_err(|e| e.to_string())?;
    } else {
        assistant_db.update_assistant(
            assistant_detail.assistant.id,
            &assistant_detail.assistant.name,
            assistant_detail.assistant.description.as_deref().unwrap_or(""),
            assistant_detail.assistant.is_addition,
        ).map_err(|e| e.to_string())?;
    }

    // Save or update the AssistantPrompts
    for prompt in assistant_detail.prompts {
        if prompt.id == 0 {
            assistant_db.add_assistant_prompt(prompt.assistant_id, &prompt.prompt).map_err(|e| e.to_string())?;
        } else {
            assistant_db.update_assistant_prompt(prompt.id, &prompt.prompt).map_err(|e| e.to_string())?;
        }
    }

    // Save or update the AssistantModels
    for model in assistant_detail.model {
        if model.id == 0 {
            assistant_db.add_assistant_model(model.assistant_id, &model.model_id, &model.alias).map_err(|e| e.to_string())?;
        } else {
            assistant_db.update_assistant_model(model.id, &model.model_id, &model.alias).map_err(|e| e.to_string())?;
        }
    }

    // Save or update the AssistantModelConfigs
    for config in assistant_detail.model_configs {
        if config.id == 0 {
            assistant_db.add_assistant_model_config(config.assistant_id, config.assistant_model_id, &config.name, config.value.as_deref().unwrap_or("")).map_err(|e| e.to_string())?;
        } else {
            assistant_db.update_assistant_model_config(config.id, &config.name, config.value.as_deref().unwrap_or("")).map_err(|e| e.to_string())?;
        }
    }

    // Save or update the AssistantPromptParams
    for param in assistant_detail.prompt_params {
        if param.id == 0 {
            assistant_db.add_assistant_prompt_param(param.assistant_id, param.assistant_prompt_id, &param.param_name, param.param_type.as_deref().unwrap_or(""), param.param_value.as_deref().unwrap_or("")).map_err(|e| e.to_string())?;
        } else {
            assistant_db.update_assistant_prompt_param(param.id, &param.param_name, param.param_type.as_deref().unwrap_or(""), param.param_value.as_deref().unwrap_or("")).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}