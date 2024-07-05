use tauri::{AppHandle, WindowBuilder, WindowEvent, WindowUrl};

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