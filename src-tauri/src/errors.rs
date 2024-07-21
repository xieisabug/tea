use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    DatabaseError(String),

    #[error("IO错误: {0}")]
    IoError(String),

    #[error("解析错误: {0}")]
    ParseError(String),

    #[error("未找到模型")]
    NoModelFound,

    #[error("大模型提供商错误: {0}")]
    ProviderError(String),

    #[error("消息通信错误: {0}")]
    WindowEmitError(String),

    #[error("未知错误: {0}")]
    UnknownError(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<std::num::ParseIntError> for AppError {
    fn from(err: std::num::ParseIntError) -> Self {
        AppError::ParseError(err.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::WindowEmitError(err.to_string())
    }
}