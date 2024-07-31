use crate::{artifacts::{applescript::run_applescript, powershell::run_powershell}, errors::AppError, window::open_preview_html_window};

#[tauri::command]
pub async fn run_artifacts(app_handle: tauri::AppHandle, lang: &str, input_str: &str) -> Result<String, AppError> {
    // Anthropic artifacts : code, markdown, html, svg, mermaid, react(引入了 lucid3-react, recharts, tailwind, shadcn/ui )
    // 加上 vue, nextjs 引入更多的前端库( echarts, antd, element-ui )
    
    match lang {
        "powershell" => {
            return Ok(run_powershell(input_str).map_err(|e| AppError::RunCodeError("PowerShell 脚本执行失败:".to_owned() + &e.to_string()))?);
        }
        "applescript" => {
            return Ok(run_applescript(input_str).map_err(|e| AppError::RunCodeError("AppleScript 脚本执行失败:".to_owned() + &e.to_string()))?);
        }
        "xml" | "svg" | "html" => {
            let _ = open_preview_html_window(app_handle, input_str.to_string()).await;
        }
        _ => {
            // Handle other languages here
        }
    }
    Ok("".to_string())
}