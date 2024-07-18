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

#[tauri::command]
pub fn add_assistant() -> Result<AssistantDetail, String> {
    println!("start add assistant");
    let assistant_db = AssistantDatabase::new().map_err(|e| e.to_string())?;

    // Add a default assistant
    let assistant_id = assistant_db.add_assistant(
        "初始助手名称",
        "This is a default assistant",
        Some(0), // Assuming 0 is a default assistant type
        false,
    ).map_err(|e| e.to_string())?;

    // Get the newly added assistant
    let assistant = assistant_db.get_assistant(assistant_id).map_err(|e| e.to_string())?;
    println!("assistant: {:?}", assistant);

    let default_prompt = "You are a helpful assistant.";
    let prompt_id = assistant_db.add_assistant_prompt(assistant_id, default_prompt).map_err(|e| e.to_string())?;
    let prompts = vec![AssistantPrompt {
        id: prompt_id,
        assistant_id: assistant_id,
        prompt: default_prompt.to_string(),
        created_time: Option::None,
    }];

    let model_id = assistant_db.add_assistant_model(assistant_id, "0", "").map_err(|e| e.to_string())?;
    println!("model_id: {:?}", model_id);

    // Add default model configs
    let default_model_configs = vec![
        AssistantModelConfig {
            id: 0,
            assistant_id,
            assistant_model_id: model_id, // Assuming 0 is a default model ID
            name: "max_tokens".to_string(),
            value: Some("2000".to_string()),
        },
        AssistantModelConfig {
            id: 0,
            assistant_id,
            assistant_model_id: model_id, // Assuming 0 is a default model ID
            name: "temperature".to_string(),
            value: Some("0.7".to_string()),
        },
        AssistantModelConfig {
            id: 0,
            assistant_id,
            assistant_model_id: model_id, // Assuming 0 is a default model ID
            name: "top_p".to_string(),
            value: Some("1.0".to_string()),
        },
        AssistantModelConfig {
            id: 0,
            assistant_id,
            assistant_model_id: model_id, // Assuming 0 is a default model ID
            name: "stream".to_string(),
            value: Some("true".to_string()),
        },
    ];
    let mut model_configs = Vec::new();
    for config in default_model_configs {
        let config_id = assistant_db.add_assistant_model_config(
            config.assistant_id,
            config.assistant_model_id,
            &config.name,
            config.value.as_deref().unwrap_or(""),
        ).map_err(|e| e.to_string())?;
        model_configs.push(AssistantModelConfig {
            id: config_id,
            assistant_id: config.assistant_id,
            assistant_model_id: config.assistant_model_id,
            name: config.name,
            value: config.value,
        });
    }
    println!("model_configs: {:?}", model_configs);

    // Model and prompt params are empty
    let model = vec![AssistantModel {
        id: model_id,
        assistant_id,
        model_id: "0".to_string(),
        alias: "".to_string(),
    }];
    let prompt_params = Vec::new();

    // Build AssistantDetail object
    let assistant_detail = AssistantDetail {
        assistant,
        prompts,
        model,
        model_configs,
        prompt_params,
    };

    Ok(assistant_detail)
}