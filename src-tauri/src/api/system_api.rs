use std::collections::HashMap;
use tauri::State;

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
    let app_dir = app.path_resolver().app_data_dir().unwrap();
    let db_path = app_dir.join("db");
    if let Err(e) = open::that(db_path) {
        return Err(format!("无法打开数据文件夹: {}", e));
    }
    Ok(())
}

#[tauri::command]
pub async fn get_bang_list() -> Result<Vec<(String, String)>, String> {
    let bang_list = vec![
        ("!s".to_string(), "插入选择的文字".to_string()),
        ("!cd".to_string(), "插入当前日期文本".to_string()),
        ("!ct".to_string(), "插入当前时间文字".to_string()),
        ("!sc".to_string(), "插入屏幕截图".to_string()),
        ("!w".to_string(), "插入网页内容".to_string()),
        (
            "!wm".to_string(),
            "插入网页内容并转换为Markdown".to_string(),
        ),
    ];
    Ok(bang_list)
}
