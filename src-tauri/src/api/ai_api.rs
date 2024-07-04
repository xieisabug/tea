use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::{AppState};

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
pub async fn ask_ai(state: tauri::State<'_, AppState>, request: AiRequest) -> Result<AiResponse, String> {
    let client = Client::new();
    let api_key = state.api_key.lock().await;
    let backend = state.backend.lock().await;

    let url = match backend.as_str() {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "ollama" => "http://localhost:11434/v1/chat/completions",
        _ => return Err("Invalid backend".to_string()),
    };

    let model = request.model.unwrap_or_else(|| "qwen2".to_string());
    let temperature = request.temperature.unwrap_or(1.0);
    let top_p = request.top_p.unwrap_or(1.0);
    let max_tokens = request.max_tokens.unwrap_or(512);

    let res = client.post(url)
        .header("Authorization", format!("Bearer {}", api_key))
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
            "max_tokens": max_tokens
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let text = response["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();

    Ok(AiResponse { text })
}
