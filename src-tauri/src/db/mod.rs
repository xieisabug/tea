use std::path::PathBuf;

use assistant_db::AssistantDatabase;
use conversation_db::ConversationDatabase;
use llm_db::LLMDatabase;
use rusqlite::params;
use semver::Version;
use system_db::SystemDatabase;

pub mod assistant_db;
pub mod conversation_db;
pub mod llm_db;
pub mod system_db;

const CURRENT_VERSION: &str = "0.0.2";

fn get_db_path(app_handle: &tauri::AppHandle, db_name: &str) -> Result<PathBuf, String> {
    let app_dir = app_handle.path_resolver().app_data_dir().unwrap();
    let db_path = app_dir.join("db");
    std::fs::create_dir_all(&db_path).map_err(|e| e.to_string())?;
    Ok(db_path.join(db_name))
}

pub fn database_upgrade(
    app_handle: &tauri::AppHandle,
    system_db: SystemDatabase,
    llm_db: LLMDatabase,
    assistant_db: AssistantDatabase,
    conversation_db: ConversationDatabase,
) -> Result<(), String> {
    let system_version = system_db.get_config("system_version");
    match system_version {
        Ok(version) => {
            if version.is_empty() {
                let _ = system_db.add_system_config("system_version", CURRENT_VERSION);

                if let Err(err) = system_db.init_feature_config() {
                    println!("init_feature_config error: {:?}", err);
                }
            } else {
                // 临时逻辑
                let now_version;
                if version == "0.1" {
                    let _ = system_db.delete_system_config("system_version");
                    let _ = system_db.add_system_config("system_version", "0.0.1");
                    now_version = "0.0.1";
                } else {
                    now_version = version.as_str();
                }
                println!("system_version: {}", now_version);

                let current_version = Version::parse(now_version).unwrap();

                // 定义需要执行特殊逻辑的版本
                let special_versions: Vec<(
                    &str,
                    fn(
                        &SystemDatabase,
                        &LLMDatabase,
                        &AssistantDatabase,
                        &ConversationDatabase,
                        &tauri::AppHandle,
                    ) -> Result<(), String>,
                )> = vec![("0.0.2", special_logic_0_0_2)];

                for (version_str, logic) in special_versions.iter() {
                    let version = Version::parse(version_str).unwrap();
                    if current_version < version {
                        let result = logic(
                            &system_db,
                            &llm_db,
                            &assistant_db,
                            &conversation_db,
                            app_handle,
                        );
                        match result {
                            Ok(_) => {
                                println!("special_logic_{} done", version_str);
                            },
                            Err(err) => {
                                println!("special_logic_{} error: {:?}", version_str, err);
                                app_handle.exit(-1);
                            }
                        }
                    }
                }

                let _ = system_db.update_system_config("system_version", CURRENT_VERSION);
            }
        }
        Err(err) => {
            println!("get system_version error: {:?}", err);
        }
    }

    Ok(())
}

fn special_logic_0_0_2(
    _system_db: &SystemDatabase,
    _llm_db: &LLMDatabase,
    assistant_db: &AssistantDatabase,
    _conversation_db: &ConversationDatabase,
    app_handle: &tauri::AppHandle,
) -> Result<(), String> {
    println!("special_logic_0_0_2");
    // 开始事务
    assistant_db
        .conn
        .execute("BEGIN TRANSACTION;", [])
        .map_err(|e| format!("添加字段model_code失败: {}", e.to_string()))?;

    // 添加新字段
    assistant_db
        .conn
        .execute(
            "ALTER TABLE assistant_model ADD COLUMN provider_id INTEGER NOT NULL DEFAULT 0;",
            [],
        )
        .map_err(|e| format!("添加字段provider_id失败: {}", e.to_string()))?;
    assistant_db
        .conn
        .execute(
            "ALTER TABLE assistant_model ADD COLUMN model_code TEXT NOT NULL DEFAULT '';",
            [],
        )
        .map_err(|e| format!("添加字段model_code失败: {}", e.to_string()))?;

    // 创建 LLMDatabase 实例
    let llm_db = LLMDatabase::new(app_handle).map_err(|e| e.to_string())?;

    // 查询所有 model_id
    let mut stmt = assistant_db
        .conn
        .prepare("SELECT model_id FROM assistant_model")
        .map_err(|e| format!("查询助手模型失败: {}", e.to_string()))?;
    let model_ids_iter = stmt
        .query_map([], |row| row.get::<_, i64>(0))
        .map_err(|e| format!("助手模型id转i64失败: {}", e.to_string()))?;

    for model_id_result in model_ids_iter {
        let model_id = model_id_result.map_err(|e| e.to_string())?;

        if let Ok(model) = llm_db.get_llm_model_detail_by_id(&model_id) {
            // 处理查询到的 model
            // 更新新字段
            assistant_db
                .conn
                .execute(
                    "UPDATE assistant_model SET provider_id = ?, model_code = ? WHERE model_id = ?;",
                    params![model.provider.id, model.model.code, model_id],
                )
                .map_err(|e| format!("更新助手模型失败: {}", e.to_string()))?;
        } else {
            // 查询不到结果，跳过这次循环
            continue;
        }
    }

    // 删除旧字段
    assistant_db
        .conn
        .execute("ALTER TABLE assistant_model DROP COLUMN model_id;", [])
        .map_err(|e| format!("删除model_id字段失败: {}", e.to_string()))?;

    // 提交事务
    assistant_db
        .conn
        .execute("COMMIT;", [])
        .map_err(|e| format!("事务提交失败: {}", e.to_string()))?;
    println!("special_logic_0_0_2 done");
    Ok(())
}
