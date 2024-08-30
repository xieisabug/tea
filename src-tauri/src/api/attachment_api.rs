use crate::db::conversation_db::{AttachmentType, Repository};
use anyhow::{anyhow, Result};
use base64::encode;
use serde::Serialize;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use mime_guess::from_path;

use crate::{
    db::conversation_db::{ConversationDatabase, MessageAttachment},
    errors::AppError,
};

#[derive(Serialize)]
pub struct AttachmentResult {
    attachment_id: i64,
}

#[tauri::command]
pub async fn add_attachment(
    app_handle: tauri::AppHandle,
    file_url: String,
) -> Result<AttachmentResult, AppError> {
    // 1. 解析文件路径
    let file_path = Path::new(&file_url).to_path_buf();

    // 2. 检查文件是否存在
    if !file_path.exists() {
        return Err(AppError::Anyhow(anyhow!("File not found").to_string()));
    }

    // 3. 解析文件类型
    let file_type = from_path(&file_path)
        .first_or_octet_stream()
        .to_string();
    let mut file_type_classify = String::new();

    println!("检测到的文件类型: {}", file_type);

    if file_type.starts_with("text/") {
        file_type_classify = "text".to_string();
    } else if file_type.starts_with("image/") {
        file_type_classify = "image".to_string();
    }
    println!("文件类型大类: {}", file_type_classify);

    let db = ConversationDatabase::new(&app_handle).map_err(AppError::from)?;

    // 4. 使用不同类型的文件读取方式来进行读取
    let reader = match file_type_classify.as_str() {
        "image" => {
            // 使用 BufReader 读取图片文件
            let base64_str =
                read_image_as_base64(file_path.to_str().unwrap()).map_err(AppError::from)?;
            match file_type.as_str() {
                "image/jpeg" => "data:image/jpeg;base64,".to_string() + &base64_str,
                "image/png" => "data:image/png;base64,".to_string() + &base64_str,
                "image/gif" => "data:image/gif;base64,".to_string() + &base64_str,
                "image/webp" => "data:image/webp;base64,".to_string() + &base64_str,
                _ => {
                    return Err(AppError::Anyhow(
                        anyhow!("Unsupported file type").to_string(),
                    ))
                }
            }
        }
        "text" => {
            // 读取文本文件
            let mut file = File::open(file_path)?;
            let mut content = String::new();
            file.read_to_string(&mut content)?;
            content
        }
        _ => {
            return Err(AppError::Anyhow(
                anyhow!("Unsupported file type").to_string(),
            ))
        }
    };

    // 5. 保存到数据库
    // todo: 添加数据库配置和 CRUD 操作
    let attachment_id = match file_type_classify.as_str() {
        "image" => {
            // 使用 BufReader 读取图片文件
            let message_attachment = db.attachment_repo().unwrap().create(&MessageAttachment {
                id: 0,
                message_id: -1,
                attachment_type: AttachmentType::Image,
                attachment_url: Some(file_url),
                attachment_content: Some(reader),
                use_vector: false,
                token_count: Some(0),
            })?;
            message_attachment.id
        }
        "text" => {
            // 使用 BufReader 读取图片文件
            let message_attachment = db.attachment_repo().unwrap().create(&MessageAttachment {
                id: 0,
                message_id: -1,
                attachment_type: AttachmentType::Text,
                attachment_url: Some(file_url),
                attachment_content: Some(reader),
                use_vector: false,
                token_count: Some(0),
            })?;
            message_attachment.id
        }
        _ => {
            return Err(AppError::Anyhow(
                anyhow!("Unsupported file type").to_string(),
            ))
        }
    };

    // 6. 返回到前端 attachment_id，等待之后的 message 创建和更新
    Ok(AttachmentResult { attachment_id })
}

#[tauri::command]
pub async fn add_attachment_content(
    app_handle: tauri::AppHandle,
    file_content: String,
    file_name: String,
    attachment_type: i64,
) -> Result<AttachmentResult, AppError> {
    println!("add_attachment_content file_name: {}", file_name);
    let db = ConversationDatabase::new(&app_handle).map_err(AppError::from)?;

    let message_attachment = db.attachment_repo().unwrap().create(&MessageAttachment {
        id: 0,
        message_id: -1,
        attachment_type: AttachmentType::try_from(attachment_type).unwrap(),
        attachment_url: Some(file_name),
        attachment_content: Some(file_content),
        use_vector: false,
        token_count: Some(0),
    });
    let attachment_id = match message_attachment {
        Ok(t) => t.id,
        Err(e) => return Err(AppError::from(e)),
    };
    Ok(AttachmentResult { attachment_id })
}

fn read_image_as_base64(file_path: &str) -> Result<String> {
    // 打开文件
    let mut file = File::open(file_path)?;

    // 读取文件内容到字节向量
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    let base64_string = encode(&buffer);
    Ok(base64_string)
}