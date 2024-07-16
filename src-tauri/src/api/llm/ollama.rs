use crate::{api::llm_api::LlmModel, db::{assistant_db::AssistantModelConfig, llm_db::LLMProviderConfig}};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use reqwest::Client;
use tokio::sync::mpsc;
use serde_json::json;
use futures::{future::BoxFuture, StreamExt};

use super::ModelProvider;

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

pub struct OllamaProvider {
    llm_provider_config: Vec<LLMProviderConfig>,
    client: Client,
}

impl ModelProvider for OllamaProvider {
    fn new(llm_provider_config: Vec<LLMProviderConfig>) -> Self {
        OllamaProvider {
            llm_provider_config,
            client: Client::new(),
        }
    }

    fn chat(&self, messages: Vec<(String, String)>, model_config: Vec<AssistantModelConfig>) 
        -> BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> = config.into_iter()
                .map(|c| (c.name, c.value))
                .collect();

            let url = format!("{}api/chat", config_map.get("end_point").unwrap_or(&"http://localhost:11434/".to_string()));

            let json_messages = messages.iter().map(|(message_type, content)| {
                json!({
                    "role": message_type,
                    "content": content
                })
            }).collect::<Vec<serde_json::Value>>();

            let model = &model_config[0].name; // Assuming the first model config is the one to use

            let body = json!({
                "model": model,
                "messages": json_messages,
                "stream": false
            });

            let response = client.post(&url)
                .json(&body)
                .send()
                .await?
                .json::<serde_json::Value>()
                .await?;

            if let Some(content) = response["message"]["content"].as_str() {
                Ok(content.to_string())
            } else {
                Err("Failed to get content from response".into())
            }
        })
    }

    fn chat_stream(&self, messages: Vec<(String, String)>, model_config: Vec<AssistantModelConfig>, tx: mpsc::Sender<String>) 
        -> BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> = config.into_iter()
                .map(|c| (c.name, c.value))
                .collect();

            let url = format!("{}api/chat", config_map.get("end_point").unwrap_or(&"http://localhost:11434/".to_string()));

            let json_messages = messages.iter().map(|(message_type, content)| {
                json!({
                    "role": message_type,
                    "content": content
                })
            }).collect::<Vec<serde_json::Value>>();

            let model = &model_config[0].name; // Assuming the first model config is the one to use

            let body = json!({
                "model": model,
                "messages": json_messages,
                "stream": true
            });

            let response = client.post(&url)
                .json(&body)
                .send()
                .await?;

            let mut stream = response.bytes_stream();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk?;
                let text = String::from_utf8_lossy(&chunk);
                if text.starts_with("data: ") {
                    let content = text.trim_start_matches("data: ");
                    if !content.contains("data: [DONE]") {
                        if let Ok(response) = serde_json::from_str::<serde_json::Value>(content) {
                            if let Some(delta) = response["message"]["content"].as_str() {
                                tx.send(delta.to_string()).await?;
                            }
                        }
                    }
                }
            }

            Ok(())
        })
    }

    fn models(&self) -> BoxFuture<'static, Result<Vec<LlmModel>, String>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let mut result = Vec::new();

            let config_map: HashMap<String, String> = config.into_iter()
                .map(|c| (c.name, c.value))
                .collect();

            let url = format!("{}api/tags", config_map.get("end_point").unwrap_or(&"http://localhost:11434/".to_string()));

            let response = client.get(&url)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let models_response: ModelsResponse = response.json()
                .await
                .map_err(|e| e.to_string())?;

            for model in models_response.models {
                let llm_model = LlmModel {
                    id: 0, // You need to set this according to your needs
                    name: model.name,
                    llm_provider_id: 10, // You need to set this according to your needs
                    code: model.model,
                    description: format!("Family: {}, Parameter Size: {}, Quantization Level: {}", 
                                         model.details.family, model.details.parameter_size, model.details.quantization_level),
                    vision_support: false, // Set this according to your needs
                    audio_support: false, // Set this according to your needs
                    video_support: false, // Set this according to your needs
                };
                result.push(llm_model);
            }

            Ok(result)
        })
    }
}
