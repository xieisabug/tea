#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod api;
mod artifacts;
mod db;
mod errors;
mod plugin;
mod state;
mod template_engine;
mod window;

use std::collections::HashMap;
use std::sync::Arc;

use crate::api::ai_api::{ask_ai, cancel_ai, regenerate_ai};
use crate::api::artifacts_api::run_artifacts;
use crate::api::assistant_api::{
    add_assistant, copy_assistant, delete_assistant, get_assistant, get_assistants, save_assistant,
};
use crate::api::attachment_api::{add_attachment, add_attachment_content};
use crate::api::conversation_api::{
    delete_conversation, get_conversation_with_messages, list_conversations, update_conversation,
};
use crate::api::llm_api::{
    add_llm_model, add_llm_provider, delete_llm_model, delete_llm_provider, fetch_model_list,
    get_llm_models, get_llm_provider_config, get_llm_providers, get_models_for_select,
    update_llm_provider, update_llm_provider_config,
};
use crate::api::system_api::{get_all_feature_config, save_feature_config};
use crate::db::assistant_db::AssistantDatabase;
use crate::db::llm_db::LLMDatabase;
use crate::db::system_db::SystemDatabase;
use crate::window::{create_ask_window, open_chat_ui_window, open_config_window};
use chrono::Local;
use db::conversation_db::ConversationDatabase;
use db::database_upgrade;
use db::plugin_db::PluginDatabase;
use db::system_db::FeatureConfig;
use get_selected_text::get_selected_text;
use serde::{Deserialize, Serialize};
use state::message_token::MessageTokenManager;
use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, RunEvent, SystemTray, SystemTrayEvent,
    SystemTrayMenu,
};
use tokio::sync::Mutex as TokioMutex;

struct AppState {
    selected_text: TokioMutex<String>,
}

#[derive(Clone)]
struct FeatureConfigState {
    configs: Arc<TokioMutex<Vec<FeatureConfig>>>,
    config_feature_map: Arc<TokioMutex<HashMap<String, HashMap<String, FeatureConfig>>>>,
}

#[derive(Clone)]
struct NameCacheState {
    assistant_names: Arc<TokioMutex<HashMap<i64, String>>>,
    model_names: Arc<TokioMutex<HashMap<i64, String>>>,
}

#[derive(Serialize, Deserialize)]
struct Config {
    selected_text: String,
}

#[cfg(target_os = "macos")]
fn query_accessibility_permissions() -> bool {
    let trusted = macos_accessibility_client::accessibility::application_is_trusted();
    if trusted {
        print!("Application is totally trusted!");
    } else {
        print!("Application isn't trusted :(");
        // let trusted = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        // return trusted;
    }
    trusted
}

#[cfg(not(target_os = "macos"))]
fn query_accessibility_permissions() -> bool {
    return true;
}

#[tauri::command]
async fn get_selected() -> Result<String, String> {
    let result = get_selected_text().unwrap_or_default();
    println!("{:?}", result);
    Ok(result)
}

#[tauri::command]
async fn save_config(state: tauri::State<'_, AppState>, config: Config) -> Result<(), String> {
    let mut selected_text = state.selected_text.lock().await;
    *selected_text = config.selected_text;
    Ok(())
}

#[tauri::command]
async fn get_config(state: tauri::State<'_, AppState>) -> Result<Config, String> {
    let selected_text = state.selected_text.lock().await;
    Ok(Config {
        selected_text: selected_text.clone(),
    })
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let tray_menu = SystemTrayMenu::new().add_item(show).add_item(quit);
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
                    let ask_window = app.get_window("ask");
                    let chat_ui_window = app.get_window("chat_ui");

                    match (ask_window, chat_ui_window) {
                        (None, _) => {
                            println!("Creating ask window");
                            create_ask_window(&app);
                        }
                        (Some(window), _) => {
                            println!("Focusing ask window");
                            if window.is_minimized().unwrap_or(false) {
                                window.unminimize().unwrap();
                            }
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.handle();

            let system_db = SystemDatabase::new(&app_handle)?;
            let llm_db = LLMDatabase::new(&app_handle)?;
            let assistant_db = AssistantDatabase::new(&app_handle)?;
            let conversation_db = ConversationDatabase::new(&app_handle)?;
            let plugin_db = PluginDatabase::new(&app_handle)?;
            system_db.create_tables()?;
            llm_db.create_tables()?;
            assistant_db.create_tables()?;
            conversation_db.create_tables()?;
            plugin_db.create_tables()?;

            let _ = database_upgrade(
                &app_handle,
                system_db,
                llm_db,
                assistant_db,
                conversation_db,
            );

            app.manage(initialize_state(&app_handle));
            app.manage(initialize_name_cache_state(&app_handle));

            if app.get_window("main").is_none() {
                create_ask_window(&app_handle)
            }

            if !query_accessibility_permissions() {
                println!("Please grant accessibility permissions to the app")
            }

            Ok(())
        })
        .manage(AppState {
            selected_text: TokioMutex::new(String::new()),
        })
        .manage(MessageTokenManager::new())
        .invoke_handler(tauri::generate_handler![
            ask_ai,
            regenerate_ai,
            cancel_ai,
            get_selected,
            open_config_window,
            open_chat_ui_window,
            save_config,
            get_config,
            get_all_feature_config,
            save_feature_config,
            get_llm_providers,
            update_llm_provider,
            add_llm_provider,
            delete_llm_provider,
            get_llm_provider_config,
            update_llm_provider_config,
            get_llm_models,
            fetch_model_list,
            get_models_for_select,
            add_llm_model,
            delete_llm_model,
            add_attachment,
            add_attachment_content,
            get_assistants,
            get_assistant,
            save_assistant,
            add_assistant,
            delete_assistant,
            copy_assistant,
            list_conversations,
            get_conversation_with_messages,
            delete_conversation,
            update_conversation,
            run_artifacts
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, e| match e {
        RunEvent::Ready => {
            let app_handle = app_handle.clone();
            // Register global shortcut
            // 快捷键的逻辑要理一下：
            // 什么都没有的时候，快捷打开ask窗口
            // ask窗口打开的时候，快捷打开chat_ui窗口（这一步现在是在js里做的）
            // chat_ui窗口打开的时候，不会再打开任何窗口了
            app_handle
                .global_shortcut_manager()
                .register("CmdOrCtrl+Shift+I", move || {
                    println!(
                        "CmdOrCtrl+Shift+I pressed at time : {}",
                        &Local::now().to_string()
                    );

                    let text = get_selected_text().unwrap_or_default();
                    println!(
                        "Selected text: {}, at time: {}",
                        text,
                        &Local::now().to_string()
                    );

                    let app_state = app_handle.state::<AppState>();
                    *app_state.selected_text.blocking_lock() = text;

                    let ask_window = app_handle.get_window("ask");
                    let chat_ui_window = app_handle.get_window("chat_ui");

                    match (ask_window, chat_ui_window) {
                        (None, _) => {
                            println!(
                                "Creating ask window, at time: {}",
                                &Local::now().to_string()
                            );
                            create_ask_window(&app_handle);
                        }
                        (Some(window), _) => {
                            println!(
                                "Focusing ask window, at time: {}",
                                &Local::now().to_string()
                            );
                            if window.is_minimized().unwrap_or(false) {
                                window.unminimize().unwrap();
                            }
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .expect("Failed to register global shortcut");
        }
        RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });

    Ok(())
}

fn initialize_state(app_handle: &tauri::AppHandle) -> FeatureConfigState {
    let db = SystemDatabase::new(app_handle).expect("Failed to connect to database");
    let configs = db
        .get_all_feature_config()
        .expect("Failed to load feature configs");
    let mut configs_map = HashMap::new();
    for config in configs.clone().into_iter() {
        let feature_code = config.feature_code.clone();
        let key = config.key.clone();
        configs_map
            .entry(feature_code.clone())
            .or_insert(HashMap::new())
            .insert(key.clone(), config);
    }
    FeatureConfigState {
        configs: Arc::new(TokioMutex::new(configs)),
        config_feature_map: Arc::new(TokioMutex::new(configs_map)),
    }
}

fn initialize_name_cache_state(app_handle: &tauri::AppHandle) -> NameCacheState {
    let assistant_db = AssistantDatabase::new(app_handle).expect("Failed to connect to database");
    let assistants = assistant_db
        .get_assistants()
        .expect("Failed to load assistants");
    let mut assistant_names = HashMap::new();
    for assistant in assistants.clone().into_iter() {
        assistant_names.insert(assistant.id, assistant.name.clone());
    }

    let llm_db = LLMDatabase::new(app_handle).expect("Failed to connect to database");
    let models = llm_db
        .get_models_for_select()
        .expect("Failed to load models");
    let mut model_names = HashMap::new();
    for model in models.clone().into_iter() {
        model_names.insert(model.2, model.0);
    }

    NameCacheState {
        assistant_names: Arc::new(TokioMutex::new(assistant_names)),
        model_names: Arc::new(TokioMutex::new(model_names)),
    }
}
