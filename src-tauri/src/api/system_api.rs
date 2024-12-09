use std::cmp::Ord;
use std::collections::HashMap;
use tauri::{Manager, State};

use crate::template_engine::{BangType, TemplateEngine};
use crate::AppState;
use crate::FeatureConfigState;

use crate::db::system_db::{FeatureConfig, SystemDatabase};

#[tauri::command]
pub async fn get_all_feature_config(
    state: State<'_, FeatureConfigState>,
) -> Result<Vec<FeatureConfig>, String> {
    let configs = state.configs.lock().await;
    Ok(configs.clone())
}

#[tauri::command]
pub async fn save_feature_config(
    app_handle: tauri::AppHandle,
    state: State<'_, FeatureConfigState>,
    feature_code: String,
    config: HashMap<String, String>,
) -> Result<(), String> {
    let db = SystemDatabase::new(&app_handle).map_err(|e| e.to_string())?;
    let _ = db.delete_feature_config_by_feature_code(feature_code.as_str());
    for (key, value) in config.iter() {
        db.add_feature_config(&FeatureConfig {
            id: None,
            feature_code: feature_code.clone(),
            key: key.clone(),
            value: value.clone(),
            data_type: "string".to_string(),
            description: Some("".to_string()),
        })
        .map_err(|e| e.to_string())?;
    }

    // 更新内存状态
    let mut configs = state.configs.lock().await;
    let mut config_feature_map = state.config_feature_map.lock().await;

    // 删除旧的配置
    configs.retain(|c| c.feature_code != feature_code);
    config_feature_map.remove(&feature_code);

    // 添加新的配置
    for (key, value) in config.iter() {
        let new_config = FeatureConfig {
            id: None,
            feature_code: feature_code.clone(),
            key: key.clone(),
            value: value.clone(),
            data_type: "string".to_string(),
            description: Some("".to_string()),
        };
        configs.push(new_config.clone());
        config_feature_map
            .entry(feature_code.clone())
            .or_insert(HashMap::new())
            .insert(key.clone(), new_config);
    }
    Ok(())
}

#[tauri::command]
pub async fn open_data_folder(app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("db");
    if let Err(e) = open::that(db_path) {
        return Err(format!("无法打开数据文件夹: {}", e));
    }
    Ok(())
}

#[tauri::command]
pub async fn get_bang_list() -> Result<Vec<(String, String, String, BangType)>, String> {
    let engine = TemplateEngine::new();
    let mut list = vec![];
    for bang in engine.get_commands().iter() {
        list.push((
            bang.name.clone(),
            bang.complete.clone(),
            bang.description.clone(),
            bang.bang_type.clone(),
        ));
    }
    list.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(list)
}
#[tauri::command]
pub async fn get_selected_text_api(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let selected_text = state.selected_text.lock().await;
    Ok(selected_text.clone())
}
