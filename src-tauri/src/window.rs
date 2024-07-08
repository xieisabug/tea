use get_selected_text::get_selected_text;
use tauri::{AppHandle, Manager, WindowBuilder, WindowEvent, WindowUrl};

pub fn create_ask_window(app: &AppHandle) {
    let window_builder = WindowBuilder::new(
        app,
        "ask",
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

pub fn create_config_window(app: &AppHandle) {
    let window_builder = WindowBuilder::new(
        app,
        "config",
        WindowUrl::App("index.html".into())
    )
        .title("Tea")
        .inner_size(800.0, 600.0)
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
        },
        Err(e) => eprintln!("Failed to build window: {}", e),
    }
}

#[tauri::command]
pub async fn open_config_window(app_handle: AppHandle) -> Result<(), String> {
    if app_handle.get_window("config").is_none() {
        println!("Creating window");

        create_config_window(&app_handle)
    } else if let Some(window) = app_handle.get_window("config") {
        println!("Showing window");
        if window.is_minimized().unwrap_or(false) {
            window.unminimize().unwrap();
        }
        window.show().unwrap();
        window.set_focus().unwrap();
    }
    Ok(())
}