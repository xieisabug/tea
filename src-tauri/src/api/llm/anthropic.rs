use std::collections::HashMap;
use reqwest::Client;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::json;
use crate::{api::llm_api::LlmModel, db::llm_db::LLMProviderConfig};
use super::ModelProvider;

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

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicUsage {
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicContentBlock {
    #[serde(rename = "type")]
    pub content_type: String,
    pub text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicTextDelta {
    #[serde(rename = "type")]
    pub delta_type: Option<String>,
    pub text: Option<String>,
    pub stop_reason: Option<String>,
    pub stop_sequence: Option<String>,
    pub usage: Option<AnthropicUsage>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicMessage {
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub message_type: String,
    pub role: Option<String>,
    pub content: Option<Vec<AnthropicContentBlock>>,
    pub model: Option<String>,
    pub stop_reason: Option<String>,
    pub stop_sequence: Option<String>,
    pub usage: Option<AnthropicUsage>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub struct AnthropicChatCompletionChunk {
    #[serde(rename = "type")]
    pub event_type: String,
    pub index: Option<usize>,
    pub delta: Option<AnthropicTextDelta>,
    pub message: Option<AnthropicMessage>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicErrorMessage {
    #[serde(rename = "type")]
    pub error_type: String,
    pub error: AnthropicErrorDetails,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicErrorDetails {
    pub details: Option<serde_json::Value>,
    #[serde(rename = "type")]
    pub error_type: String,
    pub message: String,
}

#[derive(Debug)]
pub enum ToolChoice {
    Auto,
    Any,
    Tool(String),
}

impl Serialize for ToolChoice {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            ToolChoice::Auto => serde::Serialize::serialize(&serde_json::json!({"type": "auto"}), serializer),
            ToolChoice::Any => serde::Serialize::serialize(&serde_json::json!({"type": "any"}), serializer),
            ToolChoice::Tool(name) => serde::Serialize::serialize(&serde_json::json!({"type": "tool", "name": name}), serializer),
        }
    }
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

                let mut response = client.post(&url)
                    .header("X-API-Key", api_key)
                    .header("anthropic-version", "2023-06-01")
                    .json(&body)
                    .send()
                    .await?;

                let mut full_text = String::new();
                let mut buffer = String::new();

                while let Some(chunk) = response.chunk().await? {
                    let s = std::str::from_utf8(&chunk)
                        .map_err(|e| format!("Invalid UTF-8 sequence: {}", e))?;
                    buffer.push_str(s);
                    println!("anthropic chat stream text: {}", s);
    
                    loop {
                        if let Some(index) = buffer.find("\n\n") {
                            let chunk = buffer[..index].to_string();
                            buffer.drain(..=index + 1);
    
                            let processed_chunk = chunk
                                .trim_start_matches("event: message_start")
                                .trim_start_matches("event: content_block_start")
                                .trim_start_matches("event: ping")
                                .trim_start_matches("event: content_block_delta")
                                .trim_start_matches("event: content_block_stop")
                                .trim_start_matches("event: message_delta")
                                .trim_start_matches("event: message_stop")
                                .to_string();
    
                            let cleaned_string = processed_chunk
                                .trim_start()
                                .strip_prefix("data: ")
                                .unwrap_or(&processed_chunk);
                            print!("clean string: {}", cleaned_string);
    
                            match serde_json::from_str::<AnthropicChatCompletionChunk>(cleaned_string) {
                                Ok(d) => {
                                    if let Some(delta) = d.delta {
                                        println!("anthropic chat stream delta: {:?}", delta);

                                        if let Some(content) = delta.text {
                                            full_text.push_str(&content);
                                            tx.send((message_id, full_text.clone(), false)).await?;
                                        }
                                    } else if d.event_type == "message_stop" {

                                        tx.send((message_id, full_text.clone(), true)).await?;
                                        break;
                                    } else {
                                        eprintln!("Unknown AnthropicChatCompletionChunk: {:?}", d);
                                    }
                                }
                                Err(_) => {
                                    let processed_chunk = cleaned_string
                                        .trim_start_matches("event: error")
                                        .to_string();
                                    let cleaned_string = &processed_chunk
                                        .trim_start()
                                        .strip_prefix("data: ")
                                        .unwrap_or(&processed_chunk);
                                    match serde_json::from_str::<AnthropicErrorMessage>(
                                        &cleaned_string,
                                    ) {
                                        Ok(error_message) => {
                                            eprintln!("{}: {}", error_message.error.error_type, error_message.error.message);
                                        }
                                        Err(_) => {
                                            eprintln!(
                                                "Couldn't parse AnthropicChatCompletionChunk or AnthropicErrorMessage: {}",
                                                &cleaned_string
                                            );
                                        }
                                    }
                                }
                            }
                        } else {
                            break;
                        }
                    }
                }

                Ok(())
            })
    }

    fn models(&self) -> futures::future::BoxFuture<'static, Result<Vec<LlmModel>, String>> {
        let mut result = Vec::new();

        let models = vec![
            ("Claude 3 Opus", "claude-3-opus-20240229", "Powerful model for highly complex tasks"),
            ("Claude 3.5 Sonnet", "claude-3-5-sonnet-20240620", "Most intelligent model"),
            ("Claude 3 Sonnet", "claude-3-sonnet-20240229", "Balance of intelligence and speed"),
            ("Claude 3 Haiku", "claude-3-haiku-20240307", "Fastest and most compact model for near-instant responsiveness")
        ];

        for model in models {
            let llm_model = LlmModel {
                id: 0, // You need to set this according to your needs
                name: model.0.to_string(),
                llm_provider_id: 2, // Assuming Anthropic is provider_id 2
                code: model.1.to_string(),
                description: model.2.to_string(),
                vision_support: true, // Set this according to your needs
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
