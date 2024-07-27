use std::collections::HashMap;

use reqwest::Client;
use serde::{Serialize, Deserialize};
use serde_json::json;

use crate::{api::llm_api::LlmModel, db::llm_db::LLMProviderConfig};

use super::ModelProvider;
use futures::StreamExt;

#[derive(Serialize, Deserialize, Debug)]
struct ModelsResponse {
    models: Vec<Model>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Model {
    name: String,
    description: String,
    max_tokens: u32,
}

pub struct AnthropicProvider {
    llm_provider_config: Vec<LLMProviderConfig>,
    client: Client,
}

impl ModelProvider for AnthropicProvider {
    fn new(llm_provider_config: Vec<crate::db::llm_db::LLMProviderConfig>) -> Self where Self: Sized {
        AnthropicProvider {
            llm_provider_config,
            client: Client::new(),
        }
    }

    fn chat(&self, _message_id: i64, messages: Vec<(String, String)>, model_config: Vec<crate::db::assistant_db::AssistantModelConfig>) 
        -> futures::future::BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
            let config = self.llm_provider_config.clone();
            let client = self.client.clone();

            Box::pin(async move {
                let config_map: HashMap<String, String> = config.into_iter()
                    .map(|c| (c.name, c.value))
                    .collect();

                let url = format!("{}v1/messages", config_map.get("endpoint").unwrap_or(&"https://api.anthropic.com/".to_string()));
                let api_key = config_map.get("api_key").unwrap().clone();

                let json_messages = messages.iter().filter(|(message_type, _)| message_type != "system").map(|(message_type, content)| {
                    json!({
                        "role": message_type,
                        "content": content
                    })
                }).collect::<Vec<serde_json::Value>>();
                let system_message = messages.iter().find(|(message_type, _)| message_type == "system");


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
                    "system": system_message.map(|(_, content)| content),
                    "max_tokens": max_tokens,
                    "messages": json_messages,
                    "stream": false
                });
                println!("anthropic chat: {:?}", body);

                let response = client.post(&url)
                    .header("X-API-Key", api_key)
                    .header("anthropic-version", "2023-06-01")
                    .json(&body)
                    .send()
                    .await?
                    .json::<serde_json::Value>()
                    .await?;

                println!("anthropic chat response: {:?}", response.clone());

                if let Some(content) = response["content"][0]["text"].as_str() {
                    Ok(content.to_string())
                } else {
                    Err("Failed to get content from response".into())
                }
            })
    }

    fn chat_stream(&self, message_id: i64, messages: Vec<(String, String)>, model_config: Vec<crate::db::assistant_db::AssistantModelConfig>, tx: tokio::sync::mpsc::Sender<(i64, String, bool)>) 
        -> futures::future::BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
            let config = self.llm_provider_config.clone();
            let client = self.client.clone();

            Box::pin(async move {
                let config_map: HashMap<String, String> = config.into_iter()
                    .map(|c| (c.name, c.value))
                    .collect();

                let url = format!("{}v1/messages", config_map.get("endpoint").unwrap_or(&"https://api.anthropic.com/".to_string()));
                let api_key = config_map.get("api_key").unwrap().clone();

                let json_messages = messages.iter().filter(|(message_type, _)| message_type != "system").map(|(message_type, content)| {
                    json!({
                        "role": message_type,
                        "content": content
                    })
                }).collect::<Vec<serde_json::Value>>();
                let system_message = messages.iter().find(|(message_type, _)| message_type == "system");

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
                    "system": system_message.map(|(_, content)| content),
                    "max_tokens": max_tokens,
                    "messages": json_messages,
                    "stream": true
                });
                println!("anthropic chat stream url: {} body: {:?}", url, body);

                let response = client.post(&url)
                    .header("X-API-Key", api_key)
                    .header("anthropic-version", "2023-06-01")
                    .json(&body)
                    .send()
                    .await?;

                let mut stream = response.bytes_stream();
                let mut full_text = String::new();
                let mut buffer = Vec::new();
                
                while let Some(chunk) = stream.next().await {
                    let chunk = chunk?;
                    let text = String::from_utf8_lossy(&chunk);
                    println!("anthropic chat stream text: {}", text);
                    buffer.extend_from_slice(&chunk);

                    // 处理粘包和拆包
                    while let Some(pos) = buffer.windows(2).position(|w| w == b"\n\n") {
                        let chunk_data = buffer.drain(..=pos + 1).collect::<Vec<_>>();
                        let chunk_str = String::from_utf8_lossy(&chunk_data);

                        if chunk_str.starts_with("data: ") {
                            let json_str = &chunk_str["data: ".len()..];
                            if json_str.trim() == "[DONE]" {
                                tx.send((message_id, full_text.clone(), true)).await?;
                                return Ok(());
                            }

                            if let Ok(chunk_response) = serde_json::from_str::<serde_json::Value>(json_str) {
                                if let Some(delta) = chunk_response["delta"]["text"].as_str() {
                                    full_text.push_str(delta);
                                    tx.send((message_id, full_text.clone(), false)).await?;
                                }
                            }
                        }
                    }
                }

                Ok(())
            })
    }

    fn models(&self) -> futures::future::BoxFuture<'static, Result<Vec<LlmModel>, String>> {
        let mut result = Vec::new();

        let models = vec![
            ("claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet")
        ];

        for model in models {
            let llm_model = LlmModel {
            id: 0, // You need to set this according to your needs
            name: model.0.to_string(),
            llm_provider_id: 2, // Assuming Anthropic is provider_id 2
            code: model.0.to_string(),
            description: model.1.to_string(),
            vision_support: false, // Set this according to your needs
            audio_support: false, // Set this according to your needs
            video_support: false, // Set this according to your needs
            };
            result.push(llm_model);
        }

        Box::pin(async move {
            Ok(result)
        })
    }
}
