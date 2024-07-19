use std::collections::HashMap;

use crate::db::system_db::{FeatureConfig, SystemDatabase};

#[tauri::command]
pub async fn get_all_feature_config() -> Result<Vec<FeatureConfig>, String> {
    let db = SystemDatabase::new().map_err(|e| e.to_string())?;
    let configs = db.get_all_feature_config().map_err(|e| e.to_string())?;
    Ok(configs)
}

#[tauri::command]
pub async fn save_feature_config(feature_code: String, config: HashMap<String, String>) -> Result<(), String> {
    let db = SystemDatabase::new().map_err(|e| e.to_string())?;
    let _ = db.delete_feature_config_by_feature_code(feature_code.as_str());
    for (key, value) in config.iter() {
        db.add_feature_config(&FeatureConfig {
            id: None,
            feature_code: feature_code.clone(),
            key: key.clone(),
            value: value.clone(),
            data_type: "string".to_string(),
            description: Some("".to_string()),
        }).map_err(|e| e.to_string())?;
    }
    Ok(())
}