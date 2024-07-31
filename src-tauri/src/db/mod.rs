use std::path::PathBuf;

pub mod llm_db;
pub mod system_db;
pub mod assistant_db;
pub mod conversation_db;

fn get_db_path(app_handle: &tauri::AppHandle, db_name: &str) -> Result<PathBuf, String> {
    let app_dir = app_handle.path_resolver().app_data_dir().unwrap();
    let db_path = app_dir.join("db");
    std::fs::create_dir_all(&db_path).map_err(|e| e.to_string())?;
    Ok(db_path.join(db_name))
}