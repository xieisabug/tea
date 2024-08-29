use std::collections::HashMap;

use crate::FeatureConfigState;
use serde_json::json;
use tauri::Manager;

use crate::{
    artifacts::{applescript::run_applescript, powershell::run_powershell},
    errors::AppError,
    window::{open_preview_html_window, open_preview_react_window, open_preview_vue_window},
};
#[tauri::command]
pub async fn run_artifacts(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, FeatureConfigState>,
    lang: &str,
    input_str: &str,
) -> Result<String, AppError> {
    // Anthropic artifacts : code, markdown, html, svg, mermaid, react(引入了 lucid3-react, recharts, tailwind, shadcn/ui )
    // 加上 vue, nextjs 引入更多的前端库( echarts, antd, element-ui )

    let config_map = state.config_feature_map.lock().await;
    let preview_config = config_map
        .get("preview")
        .map(|c| c.to_owned())
        .unwrap_or_else(HashMap::new);

    let nextjs_port = preview_config
        .get("nextjs_port")
        .and_then(|config| config.value.parse::<u16>().ok())
        .unwrap_or(3001); // 默认端口如果解析失败

    let nuxtjs_port = preview_config
        .get("nuxtjs_port")
        .and_then(|config| config.value.parse::<u16>().ok())
        .unwrap_or(3002); // 默认端口如果解析失败

    match lang {
        "powershell" => {
            return Ok(run_powershell(input_str).map_err(|e| {
                AppError::RunCodeError("PowerShell 脚本执行失败:".to_owned() + &e.to_string())
            })?);
        }
        "applescript" => {
            return Ok(run_applescript(input_str).map_err(|e| {
                AppError::RunCodeError("AppleScript 脚本执行失败:".to_owned() + &e.to_string())
            })?);
        }
        "xml" | "svg" | "html" => {
            let _ = open_preview_html_window(app_handle, input_str.to_string()).await;
        }
        "react" | "jsx" => {
            let _ = open_preview_react_window(app_handle, input_str.to_string(), nextjs_port).await;
        }
        "vue" => {
            let _ = open_preview_vue_window(app_handle, input_str.to_string(), nuxtjs_port).await;
        }
        _ => {
            // Handle other languages here
            app_handle.emit_to(
                "chat_ui",
                "chat-window-alert-dialog",
                json!({"text": "暂不支持该语言的代码执行", "type": "warning"}),
            )?;
        }
    }
    Ok("".to_string())
}
