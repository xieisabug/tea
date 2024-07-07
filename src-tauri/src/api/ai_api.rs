use reqwest::Client;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use crate::{AppState};
use crate::api::llm_api::{LlmProvider, LlmProviderConfig};

#[derive(Serialize, Deserialize)]
pub struct AiRequest {
    prompt: String,
    model: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct AiResponse {
    text: String,
}

#[tauri::command]
pub async fn ask_ai(window: tauri::Window, request: AiRequest) -> Result<(), String> {
    let client = Client::new();

    let url = "http://localhost:11434/v1/chat/completions";

    let model = request.model.unwrap_or_else(|| "yi:34b-v1.5".to_string());
    let temperature = request.temperature.unwrap_or(1.0);
    let top_p = request.top_p.unwrap_or(1.0);
    let max_tokens = request.max_tokens.unwrap_or(512);

    println!("send to url : {}, model: {}", url, model);
    let mut stream = client.post(url)
        .header("Authorization", format!("Bearer {}", "123"))
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": request.prompt
                }
            ],
            "temperature": temperature,
            "top_p": top_p,
            "stream": true,
            "max_tokens": max_tokens
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        if text.starts_with("data: ") {
            let content = text.trim_start_matches("data: ");
            if content != "[DONE]" {
                if let Ok(response) = serde_json::from_str::<serde_json::Value>(content) {
                    if let Some(delta) = response["choices"][0]["delta"]["content"].as_str() {
                        window.emit("quick_chat_response", delta).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
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