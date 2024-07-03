#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;

use tauri::{WindowBuilder, WindowUrl, GlobalShortcutManager, Manager, WindowEvent, CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, RunEvent, AppHandle};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex as TokioMutex;
use reqwest::Client;

struct AppState {
    api_key: TokioMutex<String>,
    backend: TokioMutex<String>,
}

#[derive(Serialize, Deserialize)]
struct AiRequest {
    prompt: String,
    model: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
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
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);

    let app = tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(window) = app.get_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    app.exit(0);
                }
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.handle();

            if app.get_window("main").is_none() {
                create_window(&app_handle)
            }

            Ok(())
        })
        .manage(AppState {
            api_key: TokioMutex::new(String::new()),
            backend: TokioMutex::new("openai".to_string()),
        })
        .invoke_handler(tauri::generate_handler![ask_ai, save_config, get_config])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, e| match e {
        RunEvent::Ready => {
            let app_handle = app_handle.clone();
            // Register global shortcut
            app_handle.global_shortcut_manager().register("CmdOrCtrl+Shift+I", move || {
                println!("CmdOrCtrl+Shift+I pressed");
                if app_handle.get_window("main").is_none() {
                    println!("Creating window");

                    create_window(&app_handle)
                } else if let Some(window) = app_handle.get_window("main") {
                    println!("Showing window");
                    if window.is_minimized().unwrap_or(false) {
                        window.unminimize().unwrap();
                    }
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }).expect("Failed to register global shortcut");
        }
        RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    })
}

fn create_window(app: &AppHandle) {
    let window_builder = WindowBuilder::new(
        app,
        "main",
        WindowUrl::App("index.html".into())
    )
        .title("Tea")
        .inner_size(600.0, 200.0)
        .fullscreen(false)
        .resizable(false)
        .decorations(false)
        .center();

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.transparent(true);

    match window_builder.build() {
        Ok(window) => {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    window_clone.hide().unwrap();
                }
            });
        },
        Err(e) => eprintln!("Failed to build window: {}", e),
    }
}