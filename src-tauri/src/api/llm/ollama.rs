use crate::api::llm_api::LlmModel;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
struct ModelsResponse {
    models: Vec<Model>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Model {
    name: String,
    model: String,
    modified_at: String,
    size: i64,
    digest: String,
    details: Details,
}

#[derive(Serialize, Deserialize, Debug)]
struct Details {
    parent_model: String,
    format: String,
    family: String,
    families: Vec<String>,
    parameter_size: String,
    quantization_level: String,
}

pub async fn models(llm_provider_config: Vec<(i64, String, i64, String, String, bool)>) -> Result<Vec<LlmModel>, String> {
    let mut result = Vec::new();

    // config list to map
    let mut config_map = HashMap::new();
    for config in llm_provider_config {
        config_map.insert(config.1, config.3);
    }

    println!("config_map: {:?}", config_map);

    let request_models = reqwest::Client::new()
        .get(format!("{}{}", config_map.get("end_point").unwrap_or(&"http://localhost:11434/".to_string()), "api/tags"))
        .send().await.map_err(|e| e.to_string())?;

    let string = request_models.text().await.map_err(|e| e.to_string())?;
    println!("models: {}", string);

    let models_response: ModelsResponse = serde_json::from_str(&string).map_err(|e| e.to_string())?;

    for model in models_response.models {
        let llm_model = LlmModel {
            id: 0, // 你需要根据实际情况设置 id
            name: model.name,
            llm_provider_id: 0, // 你需要根据实际情况设置 llm_provider_id
            code: model.model,
            description: format!("Family: {}, Parameter Size: {}, Quantization Level: {}", model.details.family, model.details.parameter_size, model.details.quantization_level),
            vision_support: false, // 你需要根据实际情况设置 vision_support
            audio_support: false, // 你需要根据实际情况设置 audio_support
            video_support: false, // 你需要根据实际情况设置 video_support
        };
        result.push(llm_model);
    }

    Ok(result)
}