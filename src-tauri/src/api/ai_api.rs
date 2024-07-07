use reqwest::Client;
use futures::StreamExt;
use get_selected_text::get_selected_text;
use serde::{Deserialize, Serialize};
use crate::{AppState};
use crate::api::llm_api::{LlmProvider, LlmProviderConfig};
use tauri::{Manager, State};
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
        let url = "http://localhost:11434/v1/chat/completions";

        let model = request.model.unwrap_or_else(|| "yi:34b-v1.5".to_string());
        let temperature = request.temperature.unwrap_or(1.0);
        let top_p = request.top_p.unwrap_or(1.0);
        let max_tokens = request.max_tokens.unwrap_or(512);
        let stream = request.stream.unwrap_or(true);

        let mut prompt = request.prompt.clone();
        // 如果prompt里面有 !s 替换为 选中的文本
        if prompt.contains("!s") {
            prompt = prompt.replace("!s", selected_text.as_str());
        }

        println!("send to url : {}, model: {}", url, model);
        println!("prompt: {}", prompt);
        let mut body = serde_json::json!({
            "model": model,
            "messages": [
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
                                // window.emit("quick_chat_response", delta).map_err(|e| e.to_string())?;
                            }
                        }
                    }
                }
            }
        } else {
            let response_body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
            if let Some(content) = response_body["choices"][0]["message"]["content"].as_str() {
                tx.send((request.id, content.to_string())).await.unwrap();
            }
        }

        Ok::<(), String>(())
    });

    while let Some((id, content)) = rx.recv().await {
        window
            .emit(id.as_str(), content)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn models(llm_provider: LlmProvider, llm_provider_configs: Vec<LlmProviderConfig>) -> Result<(), String> {
    // convert llm_provider_config to a map
    let mut origin_config_map = std::collections::HashMap::new();
    for config in llm_provider_configs {
        origin_config_map.insert(config.name, config.value);
    }

    let default_openai_endpoint = "https://api.openai.com/v1/".to_string();
    let default_ollama_endpoint = "https://localhost:11434/".to_string();
    let url = match llm_provider.api_type.as_str() {
        "openai" => {
            let endpoint = origin_config_map.get("end_point").unwrap_or(&default_openai_endpoint);
            format!("{}{}", endpoint, "models")
        }
        "ollama" => {
            let endpoint = origin_config_map.get("end_point").unwrap_or(&default_ollama_endpoint);
            format!("{}{}", endpoint, "tags")
        }
        _ => default_openai_endpoint.to_string()
    };


    Ok(())
}