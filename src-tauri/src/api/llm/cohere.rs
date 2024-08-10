use std::collections::HashMap;

use reqwest::{
    header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION},
    Client,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio_util::sync::CancellationToken;

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
    endpoints: Vec<String>,
    finetuned: bool,
    context_length: u32,
    tokenizer_url: Option<String>,
    default_endpoints: Vec<String>,
}

pub struct CohereProvider {
    llm_provider_config: Vec<LLMProviderConfig>,
    client: Client,
}

impl ModelProvider for CohereProvider {
    fn new(llm_provider_config: Vec<crate::db::llm_db::LLMProviderConfig>) -> Self
    where
        Self: Sized,
    {
        CohereProvider {
            llm_provider_config,
            client: Client::new(),
        }
    }

    fn chat(
        &self,
        _message_id: i64,
        mut messages: Vec<(String, String)>,
        model_config: Vec<crate::db::assistant_db::AssistantModelConfig>,
        cancel_token: CancellationToken,
    ) -> futures::future::BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> =
                config.into_iter().map(|c| (c.name, c.value)).collect();

            let default_endpoint = &"https://api.cohere.ai/v1".to_string();
            let endpoint = config_map
                .get("endpoint")
                .unwrap_or(default_endpoint)
                .trim_end_matches('/');
            let url = format!("{}/chat", endpoint);
            let api_key = config_map.get("api_key").unwrap().clone();
            let message = messages.pop();
            let message = message.ok_or("No message found")?;
            if (message.0 != "user") {
                return Err("First message must be from user".into());
            }

            let json_messages = messages
                .iter()
                .map(|(message_type, content)| {
                    let role = match message_type.as_str() {
                        "assistant" => "chatbot",
                        _ => message_type,
                    };
                    json!({
                        "role": role.to_uppercase(),
                        "message": content
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
                "p": top_p,
                "max_tokens": max_tokens,
                "message": message.1,
                "chat_history": json_messages,
                "stream": false
            });
            println!("cohere chat: {:?}", body);

            let request = client
                .post(&url)
                .header(AUTHORIZATION, &format!("bearer {}", api_key))
                .json(&body);

            let response = tokio::select! {
                response = request.send() => response?,
                _ = cancel_token.cancelled() => return Err("Request cancelled".into()),
            };

            let json_response = tokio::select! {
                json = response.json::<serde_json::Value>() => json?,
                _ = cancel_token.cancelled() => return Err("Request cancelled".into()),
            };

            println!("cohere chat response: {:?}", json_response.clone());

            if let Some(content) = json_response["text"].as_str() {
                Ok(content.to_string())
            } else {
                Err("Failed to get content from response".into())
            }
        })
    }

    fn chat_stream(
        &self,
        message_id: i64,
        mut messages: Vec<(String, String)>,
        model_config: Vec<crate::db::assistant_db::AssistantModelConfig>,
        tx: tokio::sync::mpsc::Sender<(i64, String, bool)>,
        cancel_token: CancellationToken,
    ) -> futures::future::BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
        let config = self.llm_provider_config.clone();
        let client = self.client.clone();

        Box::pin(async move {
            let config_map: HashMap<String, String> =
                config.into_iter().map(|c| (c.name, c.value)).collect();

            let default_endpoint = &"https://api.cohere.ai/v1".to_string();
            let endpoint = config_map
                .get("endpoint")
                .unwrap_or(default_endpoint)
                .trim_end_matches('/');
            let url = format!("{}/chat", endpoint);
            let api_key = config_map.get("api_key").unwrap().clone();

            let message = messages.pop();
            let message = message.ok_or("No message found")?;
            if (message.0 != "user") {
                return Err("First message must be from user".into());
            }
            let json_messages = messages
                .iter()
                .map(|(message_type, content)| {
                    let role = match message_type.as_str() {
                        "assistant" => "chatbot",
                        _ => message_type,
                    };
                    json!({
                        "role": role.to_uppercase(),
                        "message": content
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
                "p": top_p,
                "max_tokens": max_tokens,
                "message": message.1,
                "chat_history": json_messages,
                "stream": true
            });
            println!("cohere chat stream url: {} body: {:?}", url, body);

            let request = client
                .post(&url)
                .header(AUTHORIZATION, &format!("bearer {}", api_key))
                .json(&body);

            let response = tokio::select! {
                response = request.send() => response?,
                _ = cancel_token.cancelled() => return Err("Request cancelled".into()),
            };

            let mut stream = response.bytes_stream();
            let mut full_text = String::new();
            let mut buffer = Vec::new();

            loop {
                tokio::select! {
                    chunk = stream.next() => {
                        match chunk {
                            Some(Ok(chunk)) => {
                                let text = String::from_utf8_lossy(&chunk);
                                println!("cohere chat stream text: {}", text);
                                buffer.extend_from_slice(&chunk);
                            
                                // 处理粘包和拆包
                                while let Some(json_end) = find_json_end(&buffer) {
                                    let chunk_data = buffer.drain(..=json_end).collect::<Vec<_>>();
                                    let chunk_str = String::from_utf8_lossy(&chunk_data);
                            
                                    if let Ok(chunk_response) = serde_json::from_str::<serde_json::Value>(&chunk_str) {
                                        match chunk_response["event_type"].as_str() {
                                            Some("text-generation") => {
                                                if let Some(delta) = chunk_response["text"].as_str() {
                                                    full_text.push_str(delta);
                                                    tx.send((message_id, full_text.clone(), false)).await?;
                                                }
                                            },
                                            Some("stream-end") => {
                                                if let Some(response) = chunk_response["response"].as_object() {
                                                    if let Some(text) = response["text"].as_str() {
                                                        full_text = text.to_string();
                                                    }
                                                }
                                                tx.send((message_id, full_text.clone(), true)).await?;
                                            },
                                            _ => {}
                                        }
                                    }
                                }
                            }
                            
                            Some(Err(e)) => return Err(e.into()),
                            None => break,
                        }
                    }
                    _ = cancel_token.cancelled() => {
                        tx.send((message_id, full_text.clone(), true)).await?;
                        return Ok(());
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

            let config_map: HashMap<String, String> =
                config.into_iter().map(|c| (c.name, c.value)).collect();
            println!("config_map: {:?}", config_map);

            let default_endpoint = &"https://api.cohere.ai/v1".to_string();
            let endpoint = config_map
                .get("endpoint")
                .unwrap_or(default_endpoint)
                .trim_end_matches('/');
            let url = format!("{}/models", endpoint);
            let api_key = config_map.get("api_key").unwrap().clone();
            println!("Cohere models endpoint : {}", url);

            let mut headers = HeaderMap::new();
            headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("bearer {}", api_key)).unwrap(),
            );

            let req = client
                .request("GET".parse().unwrap(), url)
                .headers(headers)
                .build();
            println!("req: {:?}", req);

            let response = client.execute(req.unwrap());
            let res2 = response.await;
            // println!("response: {:?}", res2.unwrap().text().await.unwrap());

            // 读取响应体为字符串
            let body = res2.expect("{}").text().await.map_err(|e| e.to_string())?;
            println!("Response body: {}", body);

            // 将字符串解析为 JSON
            let models_response: ModelsResponse = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            println!("models_response: {:?}", models_response);

            for model in models_response.models {
                let llm_model = LlmModel {
                    id: 0, // You need to set this according to your needs
                    name: model.name.clone(),
                    llm_provider_id: 1, // You need to set this according to your needs
                    code: model.name.clone(),
                    description: format!(
                        "Model name: {}, Model context_length: {}",
                        model.name.clone(),
                        model.context_length,
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

fn find_json_end(buffer: &[u8]) -> Option<usize> {
    let mut depth = 0;
    for (i, &byte) in buffer.iter().enumerate() {
        match byte {
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
            _ => {}
        }
    }
    None
}