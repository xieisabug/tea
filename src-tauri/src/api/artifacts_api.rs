use crate::{artifacts::{applescript::run_applescript, powershell::run_powershell}, errors::AppError};

#[tauri::command]
pub async fn run_artifacts(lang: &str, input_str: &str) -> Result<String, AppError> {
    let languages_and_commands = [
        ("HTML", "直接在浏览器中打开 .html 文件"),
        ("JavaScript (浏览器端)", "在 HTML 文件中引入 .js 文件，然后在浏览器中打开"),
        ("Python", "python filename.py"),
        ("Shell (Bash)", "bash filename.sh 或 ./filename.sh"),
        ("PHP", "php filename.php"),
        ("Ruby", "ruby filename.rb"),
        ("Node.js", "node filename.js"),
        ("Perl", "perl filename.pl"),
        ("Lua", "lua filename.lua"),
        ("R", "Rscript filename.R"),
        ("Julia", "julia filename.jl"),
        ("Go", "go run filename.go"),
        ("Dart", "dart filename.dart"),
        ("TypeScript (通过 ts-node)", "ts-node filename.ts"),
        ("Swift (通过 Swift REPL)", "swift filename.swift"),
    ];
    
    match lang {
        "powershell" => {
            return Ok(run_powershell(input_str).map_err(|e| AppError::RunCodeError("PowerShell 脚本执行失败:".to_owned() + &e.to_string()))?);
        }
        "applescript" => {
            return Ok(run_applescript(input_str).map_err(|e| AppError::RunCodeError("AppleScript 脚本执行失败:".to_owned() + &e.to_string()))?);
        }
        _ => {
            // Handle other languages here
        }
    }
    Ok("".to_string())
}