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

    fn chat(&self, message_id: i64, messages: Vec<(String, String)>, model_config: Vec<AssistantModelConfig>) 
        -> BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> = config.into_iter()
                .map(|c| (c.name, c.value))
                .collect();

            let url = format!("{}/api/chat", config_map.get("endpoint").unwrap_or(&"http://localhost:11434/".to_string()));

            let json_messages = messages.iter().map(|(message_type, content)| {
                json!({
                    "role": message_type,
                    "content": content
                })
            }).collect::<Vec<serde_json::Value>>();

            let model_config_map = model_config.iter().filter_map(|config| {
                config.value.as_ref().map(|value| (config.name.clone(), value.clone()))
            }).collect::<HashMap<String, String>>();
            let temperature = model_config_map.get("temperature").and_then(|v| v.parse().ok()).unwrap_or(0.75);
            let top_p = model_config_map.get("top_p").and_then(|v| v.parse().ok()).unwrap_or(1.0);
            let max_tokens = model_config_map.get("max_tokens").and_then(|v| v.parse().ok()).unwrap_or(2000);

            let model = model_config_map.get("model"); // Assuming the first model config is the one to use

            let body = json!({
                "model": model,
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens,
                "messages": json_messages,
                "stream": false
            });
            println!("ollama chat: {:?}", body);

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

    fn chat_stream(&self, message_id: i64, messages: Vec<(String, String)>, model_config: Vec<AssistantModelConfig>, tx: mpsc::Sender<(i64, String, bool)>) 
        -> BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> = config.into_iter()
                .map(|c| (c.name, c.value))
                .collect();

            let url = format!("{}/api/chat", config_map.get("endpoint").unwrap_or(&"http://localhost:11434/".to_string()));

            let json_messages = messages.iter().map(|(message_type, content)| {
                json!({
                    "role": message_type,
                    "content": content
                })
            }).collect::<Vec<serde_json::Value>>();

            let model_config_map = model_config.iter().filter_map(|config| {
                config.value.as_ref().map(|value| (config.name.clone(), value.clone()))
            }).collect::<HashMap<String, String>>();
            let temperature = model_config_map.get("temperature").and_then(|v| v.parse().ok()).unwrap_or(0.75);
            let top_p = model_config_map.get("top_p").and_then(|v| v.parse().ok()).unwrap_or(1.0);
            let max_tokens = model_config_map.get("max_tokens").and_then(|v| v.parse().ok()).unwrap_or(2000);

            let model = model_config_map.get("model"); // Assuming the first model config is the one to use

            let body = json!({
                "model": model,
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens,
                "messages": json_messages,
                "stream": true
            });

            println!("ollama chat stream: {:?}", body);

            let response = client.post(&url)
                .json(&body)
                .send()
                .await?;

            let mut stream = response.bytes_stream();
            let mut full_text = String::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk?;
                let text = String::from_utf8_lossy(&chunk);
                println!("text: {}", text.clone());

                if let Ok(response) = serde_json::from_str::<serde_json::Value>(text.to_string().as_str()) {
                    if let Some(delta) = response["message"]["content"].as_str() {
                        full_text.push_str(delta);
                        tx.send((message_id, full_text.clone(), response["done"].as_bool().unwrap())).await?;
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

            let url = format!("{}/api/tags", config_map.get("endpoint").unwrap_or(&"http://localhost:11434/".to_string()));

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
