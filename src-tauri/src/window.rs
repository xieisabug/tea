use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Emitter;
use tauri::Listener;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub fn create_ask_window(app: &AppHandle) {
    let window_builder =
        WebviewWindowBuilder::new(app, "ask", WebviewUrl::App("index.html".into()))
            .title("Aipp")
            .inner_size(800.0, 450.0)
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
        }
        Err(e) => eprintln!("Failed to build window: {}", e),
    }
}

pub fn create_config_window(app: &AppHandle) {
    let window_builder =
        WebviewWindowBuilder::new(app, "config", WebviewUrl::App("index.html".into()))
            .title("Aipp")
            .inner_size(1000.0, 800.0)
            .fullscreen(false)
            .resizable(true)
            .decorations(true)
            .center();

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.transparent(false);

    match window_builder.build() {
        Ok(window) => {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    window_clone.hide().unwrap();
                }
            });
        }
        Err(e) => eprintln!("Failed to build window: {}", e),
    }
}

pub fn create_chat_ui_window(app: &AppHandle) {
    let window_builder =
        WebviewWindowBuilder::new(app, "chat_ui", WebviewUrl::App("index.html".into()))
            .title("Aipp")
            .inner_size(1000.0, 800.0)
            .fullscreen(false)
            .resizable(true)
            .decorations(true)
            .disable_drag_drop_handler()
            .center();

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.transparent(false);

    match window_builder.build() {
        Ok(window) => {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    window_clone.hide().unwrap();
                }
            });
            let _ = window.maximize();
        }
        Err(e) => eprintln!("Failed to build window: {}", e),
    }
}

pub fn create_plugin_window(app: &AppHandle) {
    let window_builder =
        WebviewWindowBuilder::new(app, "plugin", WebviewUrl::App("index.html".into()))
            .title("Aipp")
            .inner_size(1000.0, 800.0)
            .fullscreen(false)
            .resizable(true)
            .decorations(true)
            .center();

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.transparent(false);

    match window_builder.build() {
        Ok(window) => {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    window_clone.hide().unwrap();
                }
            });
        }
        Err(e) => eprintln!("Failed to build window: {}", e),
    }
}

#[tauri::command]
pub async fn open_config_window(app_handle: AppHandle) -> Result<(), String> {
    if app_handle.get_webview_window("config").is_none() {
        println!("Creating window");

        create_config_window(&app_handle)
    } else if let Some(window) = app_handle.get_webview_window("config") {
        println!("Showing window");
        if window.is_minimized().unwrap_or(false) {
            window.unminimize().unwrap();
        }
        window.show().unwrap();
        window.set_focus().unwrap();
    }
    Ok(())
}

#[tauri::command]
pub async fn open_chat_ui_window(app_handle: AppHandle) -> Result<(), String> {
    if app_handle.get_webview_window("chat_ui").is_none() {
        println!("Creating window");

        create_chat_ui_window(&app_handle);
        app_handle
            .get_webview_window("ask")
            .unwrap()
            .hide()
            .unwrap();
    } else if let Some(window) = app_handle.get_webview_window("chat_ui") {
        println!("Showing window");
        if window.is_minimized().unwrap_or(false) {
            window.unminimize().unwrap();
        }
        window.show().unwrap();
        window.set_focus().unwrap();
        app_handle
            .get_webview_window("ask")
            .unwrap()
            .hide()
            .unwrap();
    }
    Ok(())
}

#[tauri::command]
pub async fn open_plugin_window(app_handle: AppHandle) -> Result<(), String> {
    if app_handle.get_webview_window("plugin").is_none() {
        println!("Creating window");

        create_plugin_window(&app_handle);
    } else if let Some(window) = app_handle.get_webview_window("plugin") {
        println!("Showing window");
        if window.is_minimized().unwrap_or(false) {
            window.unminimize().unwrap();
        }
        window.show().unwrap();
        window.set_focus().unwrap();
    }
    Ok(())
}

pub async fn open_preview_html_window(app_handle: AppHandle, html: String) -> Result<(), String> {
    let window_builder = WebviewWindowBuilder::new(
        &app_handle,
        "preview_html",
        WebviewUrl::App("index.html".into()),
    )
    .title("Aipp")
    .inner_size(1000.0, 800.0)
    .fullscreen(false)
    .resizable(true)
    .decorations(true)
    .center();

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.transparent(false);

    match window_builder.build() {
        Ok(window) => {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    window_clone.hide().unwrap();
                }
            });

            let window = app_handle.get_webview_window("preview_html").unwrap();

            window.clone().once("preview-window-load", move |_| {
                window.emit("preview_html", html.clone()).unwrap();
            });
        }
        Err(e) => eprintln!("Failed to build window: {}", e),
    }

    Ok(())
}

#[derive(Serialize, Deserialize)]
struct ReactComponentPayload {
    code: String,
    css: String,
}

async fn open_preview_window(
    app_handle: AppHandle,
    html: String,
    port: u16,
    window_id: &str,
    file_extension: &str,
    event_name: String,
) -> Result<(), String> {
    let mut hasher = Sha256::new();
    hasher.update(html.clone());
    let result = hasher.finalize();
    let html_hash = format!("{:x}", result);
    let file_name = format!("{}.{}", html_hash, file_extension);

    let file_content = html.clone();

    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "http://preview.teafakedomain.com:{}/api/saveFile",
            port
        ))
        .json(&serde_json::json!({
            "fileName": file_name,
            "fileContent": file_content
        }))
        .send()
        .await;

    if let Ok(response) = response {
        if response.status().is_success() {
            let url = Url::parse(&format!(
                "http://preview.teafakedomain.com:{}/previews/{}",
                port, html_hash
            ))
            .map_err(|e| e.to_string())?;

            let window_builder =
                WebviewWindowBuilder::new(&app_handle, window_id, WebviewUrl::External(url))
                    .title("Aipp")
                    .inner_size(1000.0, 800.0)
                    .fullscreen(false)
                    .resizable(true)
                    .decorations(true)
                    .center();

            #[cfg(not(target_os = "macos"))]
            let window_builder = window_builder.transparent(false);

            match window_builder.build() {
                Ok(window) => {
                    let window_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { .. } = event {
                            window_clone.hide().unwrap();
                        }
                    });

                    let window = app_handle.get_webview_window(window_id).unwrap();

                    window.clone().once("preview-window-load", move |_| {
                        let payload = ReactComponentPayload {
                            code: html.clone(),
                            css: "".to_string(),
                        };
                        let json_payload = serde_json::to_string(&payload).unwrap();
                        window.emit(&event_name, json_payload).unwrap();
                    });
                }
                Err(e) => eprintln!("Failed to build window: {}", e),
            }
        } else {
            eprintln!("Failed to save file: {}", response.status());
        }
    } else {
        eprintln!("Failed to send request: {:?}", response);
    }

    Ok(())
}

pub async fn open_preview_react_window(
    app_handle: AppHandle,
    html: String,
    port: u16,
) -> Result<(), String> {
    open_preview_window(
        app_handle,
        html,
        port,
        "preview_react",
        "js",
        "preview_react".to_string(),
    )
    .await
}

pub async fn open_preview_vue_window(
    app_handle: AppHandle,
    html: String,
    port: u16,
) -> Result<(), String> {
    open_preview_window(
        app_handle,
        html,
        port,
        "preview_vue",
        "vue",
        "preview_vue".to_string(),
    )
    .await
}
