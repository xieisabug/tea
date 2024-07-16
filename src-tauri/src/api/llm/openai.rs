use std::collections::HashMap;

use reqwest::{header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION}, Client};
use serde::{Serialize, Deserialize};
use serde_json::json;

use crate::{api::llm_api::LlmModel, db::llm_db::LLMProviderConfig};

use super::ModelProvider;
use futures::StreamExt;

#[derive(Serialize, Deserialize, Debug)]
struct ModelsResponse {
    data: Vec<Model>,
    object: String
}

#[derive(Serialize, Deserialize, Debug)]
struct Model {
    id: String,
    object: String,
    created: u64,
    owned_by: String,
    root: String,
    parent: String,
}

pub struct OpenAIProvider {
    llm_provider_config: Vec<LLMProviderConfig>,
    client: Client,
}

impl ModelProvider for OpenAIProvider {
    fn new(llm_provider_config: Vec<crate::db::llm_db::LLMProviderConfig>) -> Self where Self: Sized {
        OpenAIProvider {
            llm_provider_config,
            client: Client::new(),
        }
    }

    fn chat(&self, message_id: i64, messages: Vec<(String, String)>, model_config: Vec<crate::db::assistant_db::AssistantModelConfig>) 
        -> futures::future::BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
            let config = self.llm_provider_config.clone();
            let client = self.client.clone();
    
            Box::pin(async move {
                let config_map: HashMap<String, String> = config.into_iter()
                    .map(|c| (c.name, c.value))
                    .collect();
    
                let url = format!("{}chat/completions", config_map.get("endpoint").unwrap_or(&"https://api.openai.com/".to_string()));
    
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

    fn chat_stream(&self, message_id: i64, messages: Vec<(String, String)>, model_config: Vec<crate::db::assistant_db::AssistantModelConfig>, tx: tokio::sync::mpsc::Sender<(i64, String, bool)>) 
        -> futures::future::BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
            let config = self.llm_provider_config.clone();
            let client = self.client.clone();
    
            Box::pin(async move {
                let config_map: HashMap<String, String> = config.into_iter()
                    .map(|c| (c.name, c.value))
                    .collect();
    
                let url = format!("{}chat/completions", config_map.get("endpoint").unwrap_or(&"https://api.openai.com/v1".to_string()));
    
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
    
                let response = client.post(&url)
                    .json(&body)
                    .send()
                    .await?;
    
                let mut stream = response.bytes_stream();
                let mut full_text = String::new();
                while let Some(chunk) = stream.next().await {
                    let chunk = chunk?;
                    let text = String::from_utf8_lossy(&chunk);
                    if text.starts_with("data: ") {
                        let content = text.trim_start_matches("data: ");
                        if !content.contains("data: [DONE]") {
                            if let Ok(response) = serde_json::from_str::<serde_json::Value>(content) {
                                if let Some(delta) = response["message"]["content"].as_str() {
                                    full_text.push_str(delta);
                                    tx.send((message_id, full_text.clone(), response["done"].as_bool().unwrap())).await?;
                                }
                            }
                        }
                    }
                }
    
                Ok(())
            })
    }

    fn models(&self) -> futures::future::BoxFuture<'static, Result<Vec<LlmModel>, String>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let mut result = Vec::new();

            let config_map: HashMap<String, String> = config.into_iter()
                .map(|c| (c.name, c.value))
                .collect();
            println!("config_map: {:?}", config_map);

            let url = format!("{}models", config_map.get("endpoint").unwrap_or(&"https://api.openai.com/v1/".to_string()));
            let api_key = config_map.get("api_key").unwrap().clone();
            println!("OpenAI models endpoint : {}", url);

            let mut headers = HeaderMap::new();
            headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&api_key).unwrap());
            
            let req = client.request("GET".parse().unwrap(), url)
                .headers(headers)
                .build();
            println!("req: {:?}", req);

            let response = client.execute(req.unwrap());

            let models_response: ModelsResponse = response.await.unwrap().json()
                .await
                .map_err(|e| e.to_string())?;
            println!("models_response: {:?}", models_response);

            for model in models_response.data {
                let llm_model = LlmModel {
                    id: 0, // You need to set this according to your needs
                    name: model.id.clone(),
                    llm_provider_id: 1, // You need to set this according to your needs
                    code: model.id.clone(),
                    description: format!("Model id: {}, Model object: {}, Model ownedBy: {}", 
                                         model.id.clone(), model.object, model.owned_by),
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