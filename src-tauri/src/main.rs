#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{WindowBuilder, WindowUrl, GlobalShortcutManager, Manager};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex as TokioMutex;

struct AppState {
    api_key: TokioMutex<String>,
    backend: TokioMutex<String>,
}

#[derive(Serialize, Deserialize)]
struct AiRequest {
    prompt: String,
}

#[derive(Serialize, Deserialize)]
struct AiResponse {
    text: String,
}

#[derive(Serialize, Deserialize)]
struct Config {
    api_key: String,
    backend: String,
}

#[tauri::command]
async fn ask_ai(state: tauri::State<'_, AppState>, request: AiRequest) -> Result<AiResponse, String> {
    let client = reqwest::Client::new();
    let api_key = state.api_key.lock().await;
    let backend = state.backend.lock().await;

    let url = match backend.as_str() {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "ollama" => "http://localhost:11434/v1/chat/completions",
        _ => return Err("Invalid backend".to_string()),
    };

    let res = client.post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "prompt": request.prompt,
            "max_tokens": 100
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let text = response["choices"][0]["text"].as_str().unwrap_or("").to_string();

    Ok(AiResponse { text })
}

#[tauri::command]
async fn save_config(state: tauri::State<'_, AppState>, config: Config) -> Result<(), String> {
    let mut api_key = state.api_key.lock().await;
    let mut backend = state.backend.lock().await;
    *api_key = config.api_key;
    *backend = config.backend;
    Ok(())
}

#[tauri::command]
async fn get_config(state: tauri::State<'_, AppState>) -> Result<Config, String> {
    let api_key = state.api_key.lock().await;
    let backend = state.backend.lock().await;
    Ok(Config {
        api_key: api_key.clone(),
        backend: backend.clone(),
    })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Check if the window already exists
            if app.get_window("main").is_none() {
                // Create the main window
                let window = WindowBuilder::new(
                    app,
                    "main",
                    WindowUrl::App("index.html".into())
                )
                .title("AI Search")
                .inner_size(600.0, 60.0)
                .center()
                .build()?;

                // Register global shortcut
                app.handle().global_shortcut_manager().register("Super+Y", move || {
                    let window_clone = window.clone();
                    tauri::async_runtime::spawn(async move {
                        window_clone.set_focus().unwrap();
                        window_clone.show().unwrap();
                    });
                })?;
            }

            Ok(())
        })
        .manage(AppState {
            api_key: TokioMutex::new(String::new()),
            backend: TokioMutex::new("openai".to_string()),
        })
        .invoke_handler(tauri::generate_handler![ask_ai, save_config, get_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}