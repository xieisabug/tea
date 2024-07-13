use reqwest::Client;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::api::assistant_api::{get_assistant};
use crate::db::conversation_db::{Conversation, ConversationDatabase, Message};
use crate::db::llm_db::LLMDatabase;
use crate::{AppState};
use crate::api::llm_api::{LlmProvider, LlmProviderConfig};
use tauri::{Manager, State};
use std::collections::HashMap;
use tokio::sync::mpsc;

#[derive(Serialize, Deserialize)]
pub struct AiRequest {
    id: String,
    prompt: String,
    model: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stream: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub struct AiResponse {
    text: String,
}

#[tauri::command]
pub async fn ask_ai(state: State<'_, AppState>, window: tauri::Window, request: AiRequest) -> Result<(), String> {
    let client = Client::new();
    let (tx, mut rx) = mpsc::channel(100);

    let selected_text = state.inner().selected_text.lock().await.clone();
    tokio::spawn(async move {
        let assistant_detail = get_assistant(1).unwrap();

        if assistant_detail.model.is_empty() {
            return Err("No model found".to_string());
        }

        let db = LLMDatabase::new().map_err(|e| e.to_string())?;
        let model_id = &assistant_detail.model[0].model_id;
        println!("model id : {}", model_id);

        let model_detail = db.get_llm_model_detail(model_id.parse::<i64>().unwrap()).unwrap();
        let assistant_prompt = &assistant_detail.prompts[0].prompt;
        let config_map = assistant_detail.model_configs.iter().filter_map(|config| {
            config.value.as_ref().map(|value| (config.name.clone(), value.clone()))
        }).collect::<HashMap<String, String>>();
        let url = "http://localhost:11434/v1/chat/completions";

        let temperature = config_map.get("temperature").and_then(|v| v.parse().ok()).unwrap_or(0.75);
        let top_p = config_map.get("top_p").and_then(|v| v.parse().ok()).unwrap_or(1.0);
        let max_tokens = config_map.get("max_tokens").and_then(|v| v.parse().ok()).unwrap_or(2000);
        let stream = config_map.get("stream").and_then(|v| v.parse().ok()).unwrap_or(false);

        let mut prompt = request.prompt.clone();
        if prompt.contains("!s") {
            prompt = prompt.replace("!s", &selected_text);
        }

        println!("send to url: {}, model: {}", url, model_detail.model.name);
        println!("prompt: {}", prompt);

        let body = json!({
            "model": model_detail.model.code,
            "messages": [
                {
                    "role": "system",
                    "content": assistant_prompt
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "top_p": top_p,
            "stream": stream,
            "max_tokens": max_tokens
        });

        println!("request json : {}", body);

        let mut response = client.post(url)
            .header("Authorization", format!("Bearer {}", "123"))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if stream {
            let mut stream = response.bytes_stream();
            while let Some(chunk) = stream.next().await {
                let id = request.id.clone();
                let chunk = chunk.map_err(|e| e.to_string())?;
                let text = String::from_utf8_lossy(&chunk);
                if text.starts_with("data: ") {
                    let content = text.trim_start_matches("data: ");
                    if content != "[DONE]" {
                        if let Ok(response) = serde_json::from_str::<serde_json::Value>(content) {
                            if let Some(delta) = response["choices"][0]["delta"]["content"].as_str() {
                                tx.send((id, delta.to_string())).await.unwrap();
                            }
                        }
                    }
                }
            }
        } else {
            let response_body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
            if let Some(content) = response_body["choices"][0]["message"]["content"].as_str() {
                tx.send((request.id, content.to_string())).await.unwrap();
                let _ = save_conversation(1, model_id.parse::<i64>().unwrap(), 
                    vec![("system".to_string(), "assistant_prompt".to_string()), ("user".to_string(), prompt), ("assistant".to_string(), content.to_string())]);
            }
        }

        Ok::<(), String>(())
    });

    while let Some((id, content)) = rx.recv().await {
        window.emit(id.as_str(), content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn save_conversation(assistant_id: i64, llm_model_id: i64, messages: Vec<(String, String)>) -> Result<(), String> {
    let db = ConversationDatabase::new().map_err(|e: rusqlite::Error| e.to_string())?;
    let conversation = Conversation::create(&db.conn, "新对话".to_string(), Some(assistant_id));
    let conversation_id = conversation.unwrap().id;
    for (message_type, content) in messages {
        let _ = Message::create(&db.conn, conversation_id, message_type, content, Some(llm_model_id), 0);
    }

    Ok(())
}