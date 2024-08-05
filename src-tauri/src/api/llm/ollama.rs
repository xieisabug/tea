use crate::{
    api::llm_api::LlmModel,
    db::{assistant_db::AssistantModelConfig, llm_db::LLMProviderConfig},
};
use futures::{future::BoxFuture, StreamExt};
use reqwest::{
    header::AUTHORIZATION,
    Client,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio_util::sync::CancellationToken;
use std::collections::HashMap;
use tokio::{select, sync::mpsc};

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

    fn chat(
        &self,
        _message_id: i64,
        messages: Vec<(String, String)>,
        model_config: Vec<AssistantModelConfig>,
        cancel_token: CancellationToken,
    ) -> BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> =
                config.into_iter().map(|c| (c.name, c.value)).collect();

            let default_endpoint = &"http://localhost:11434".to_string();
            let endpoint = config_map
                .get("endpoint")
                .unwrap_or(default_endpoint)
                .trim_end_matches('/');
            let url = format!(
                "{}/api/chat",
                endpoint
            );
            let api_key = config_map.get("api_key").unwrap().clone();

            let json_messages = messages
                .iter()
                .map(|(message_type, content)| {
                    json!({
                        "role": message_type,
                        "content": content
                    })
                })
                .collect::<Vec<serde_json::Value>>();

            let model_config_map = model_config
                .iter()
                .filter_map(|config| {
                    config
                        .value
                        .as_ref()
                        .map(|value| (config.name.clone(), value.clone()))
                })
                .collect::<HashMap<String, String>>();
            let temperature = model_config_map
                .get("temperature")
                .and_then(|v| v.parse().ok())
                .unwrap_or(0.75);
            let top_p = model_config_map
                .get("top_p")
                .and_then(|v| v.parse().ok())
                .unwrap_or(1.0);
            let max_tokens = model_config_map
                .get("max_tokens")
                .and_then(|v| v.parse().ok())
                .unwrap_or(2000);

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

            let request = client
                .post(&url)
                .header(AUTHORIZATION, &format!("Bearer {}", api_key))
                .json(&body);

            let response = tokio::select! {
                response = request.send() => response?,
                _ = cancel_token.cancelled() => return Err("Request cancelled".into()),
            };

            let json_response = tokio::select! {
                json = response.json::<serde_json::Value>() => json?,
                _ = cancel_token.cancelled() => return Err("Request cancelled".into()),
            };

            if let Some(content) = json_response["message"]["content"].as_str() {
                Ok(content.to_string())
            } else {
                Err("Failed to get content from response".into())
            }
        })
    }

    fn chat_stream(
        &self,
        message_id: i64,
        messages: Vec<(String, String)>,
        model_config: Vec<AssistantModelConfig>,
        tx: mpsc::Sender<(i64, String, bool)>,
        cancel_token: CancellationToken,
    ) -> BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> =
                config.into_iter().map(|c| (c.name, c.value)).collect();

            let default_endpoint = &"http://localhost:11434".to_string();
            let endpoint = config_map
                .get("endpoint")
                .unwrap_or(default_endpoint)
                .trim_end_matches('/');
            let url = format!(
                "{}/api/chat",
                endpoint
            );
            println!("url: {}", url);
            let api_key = config_map.get("api_key").unwrap_or(&"".to_string()).clone();

            let json_messages = messages
                .iter()
                .map(|(message_type, content)| {
                    json!({
                        "role": message_type,
                        "content": content
                    })
                })
                .collect::<Vec<serde_json::Value>>();

            let model_config_map = model_config
                .iter()
                .filter_map(|config| {
                    config
                        .value
                        .as_ref()
                        .map(|value| (config.name.clone(), value.clone()))
                })
                .collect::<HashMap<String, String>>();
            let temperature = model_config_map
                .get("temperature")
                .and_then(|v| v.parse().ok())
                .unwrap_or(0.75);
            let top_p = model_config_map
                .get("top_p")
                .and_then(|v| v.parse().ok())
                .unwrap_or(1.0);
            let max_tokens = model_config_map
                .get("max_tokens")
                .and_then(|v| v.parse().ok())
                .unwrap_or(2000);

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

            let request = client
                .post(&url)
                .header(AUTHORIZATION, &format!("Bearer {}", api_key))
                .json(&body);

            println!("request: {:?}", request);

            let response = tokio::select! {
                response = request.send() => response?,
                _ = cancel_token.cancelled() => return Err("Request cancelled".into()),
            };

            let mut stream = response.bytes_stream();
            let mut full_text = String::new();

            loop {
                select! {
                    chunk = stream.next() => {
                        match chunk {
                            Some(Ok(chunk)) => {
                                let text = String::from_utf8_lossy(&chunk);
                                println!("text: {}", text.clone());
    
                                if let Ok(response) = serde_json::from_str::<serde_json::Value>(text.to_string().as_str()) {
                                    if let Some(delta) = response["message"]["content"].as_str() {
                                        full_text.push_str(delta);
                                        tx.send((message_id, full_text.clone(), response["done"].as_bool().unwrap())).await
                                            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                                    }
                                    if response["done"].as_bool().unwrap_or(false) {
                                        break;
                                    }
                                }
                            },
                            Some(Err(e)) => return Err(Box::new(e) as Box<dyn std::error::Error>),
                            None => break,
                        }
                    },
                    _ = cancel_token.cancelled() => {
                        tx.send((message_id, full_text.clone(), true)).await?;
                        return Ok(());
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

            let config_map: HashMap<String, String> =
                config.into_iter().map(|c| (c.name, c.value)).collect();

            let default_endpoint = &"http://localhost:11434".to_string();
            let endpoint = config_map
                .get("endpoint")
                .unwrap_or(default_endpoint)
                .trim_end_matches('/');
            let url = format!(
                "{}/api/tags",
                endpoint
            );

            let response = client.get(&url).send().await.map_err(|e| e.to_string())?;

            let models_response: ModelsResponse =
                response.json().await.map_err(|e| e.to_string())?;

            for model in models_response.models {
                let llm_model = LlmModel {
                    id: 0, // You need to set this according to your needs
                    name: model.name,
                    llm_provider_id: 10, // You need to set this according to your needs
                    code: model.model,
                    description: format!(
                        "Family: {}, Parameter Size: {}, Quantization Level: {}",
                        model.details.family,
                        model.details.parameter_size,
                        model.details.quantization_level
                    ),
                    vision_support: false, // Set this according to your needs
                    audio_support: false,  // Set this according to your needs
                    video_support: false,  // Set this according to your needs
                };
                result.push(llm_model);
            }

            Ok(result)
        })
    }
}
