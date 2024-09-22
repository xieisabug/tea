use std::collections::HashMap;
use chrono::Local; // 需要在Cargo.toml中添加 `chrono` 依赖
use regex::Regex; // 需要在Cargo.toml中添加 `regex` 依赖
use reqwest; // 需要在 Cargo.toml 中添加 `reqwest` 依赖
use htmd; // 需要在 Cargo.toml 中添加 `htmd` 依赖
use screenshots::Screen; // 需要在 Cargo.toml 中添加 `screenshots` 依赖

// 定义命令处理函数类型
type CommandFn = fn(&TemplateEngine, &str, &HashMap<String, String>) -> String;

// 获取当前日期的命令处理函数
fn current_date(_: &TemplateEngine, _: &str, _: &HashMap<String, String>) -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

// 获取当前时间的命令处理函数
fn current_time(_: &TemplateEngine, _: &str, _: &HashMap<String, String>) -> String {
    Local::now().format("%H:%M:%S").to_string()
}

// 截取指定长度字符的命令处理函数
fn sub_start(engine: &TemplateEngine, input: &str, context: &HashMap<String, String>) -> String {
    println!("input : {}", input);
    let re = Regex::new(r"\((.*),(\d+)\)").unwrap();
    for cap in re.captures_iter(input) {
        println!("cap : {:?}", &cap);
        let text_origin = &cap[1];
        let num = &cap[2];

        let text = engine.parse(text_origin.trim(), context);
        if let Ok(count) = num.trim().parse::<usize>() { 
            return text.chars().take(count).collect();
        }    
    }
    String::new()
}

fn selected_text(_: &TemplateEngine, _: &str, context: &HashMap<String, String>) -> String {
    context.get("selected_text").unwrap_or(&String::default()).to_string()
}

// 新增获取屏幕截图的函数
fn screen(_: &TemplateEngine, _: &str, _: &HashMap<String, String>) -> String {
    let screens = Screen::all().unwrap();
    let screen = &screens[0];
    let image = screen.capture().unwrap();
    let buffer = image.to_png().unwrap();
    format!("data:image/png;base64,{}", base64::encode(buffer))
}

// 新增获取网页内容的函数
fn web(_: &TemplateEngine, url: &str, _: &HashMap<String, String>) -> String {
    // 移除url中前后的括号
    let url = url.trim_start_matches('(').trim_end_matches(')');

    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap();

    match client.get(url).send() {
        Ok(response) => response.text().unwrap_or_else(|_| "Failed to get web content".to_string()),
        Err(err) => err.to_string()
    }
}

// 新增获取网页内容并转换为 Markdown 的函数
fn web_to_markdown(_: &TemplateEngine, url: &str, _: &HashMap<String, String>) -> String {
    // 移除url中前后的括号
    let url = url.trim_start_matches('(').trim_end_matches(')');

    let client = reqwest::blocking::Client::new();
    match client.get(url).send() {
        Ok(response) => {
            let html = response.text().unwrap_or_default();
            htmd::parse(&html)
        },
        Err(_) => "".to_string(),
    }
}

// 模板解析器结构体
pub struct TemplateEngine {
    commands: HashMap<String, CommandFn>,
}

impl TemplateEngine {
    // 初始化模板解析器
    pub fn new() -> Self {
        let mut commands = HashMap::new();
        commands.insert("current_date".to_string(), current_date as CommandFn);
        commands.insert("cd".to_string(), current_date as CommandFn);

        commands.insert("current_time".to_string(), current_time as CommandFn);
        commands.insert("ct".to_string(), current_time as CommandFn);

        commands.insert("sub_start".to_string(), sub_start as CommandFn);

        commands.insert("selected_text".to_string(), selected_text as CommandFn);
        commands.insert("s".to_string(), selected_text as CommandFn);

        commands.insert("screen".to_string(), screen as CommandFn);
        commands.insert("sc".to_string(), screen as CommandFn);

        commands.insert("web".to_string(), web as CommandFn);
        commands.insert("w".to_string(), web as CommandFn);

        commands.insert("web_to_markdown".to_string(), web_to_markdown as CommandFn);
        commands.insert("wm".to_string(), web_to_markdown as CommandFn);

        TemplateEngine { commands }
    }

    // 注册命令
    pub fn register_command(&mut self, name: &str, handler: CommandFn) {
        self.commands.insert(name.to_string(), handler);
    }

    // 解析并替换模板字符串
    pub fn parse(&self, template: &str, context: &HashMap<String, String>) -> String {
        // !@\s*(\w+)(\([^)]*\))?@!
        let re = Regex::new(r"[!！](\w+)(\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*\))*\))*\))*\))*\))*\))*\))?").unwrap();
        // let re = Regex::new(r"[!！](\w+)(\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*\))*\))*\))*\))*\))*\))*\))?").unwrap();
        let mut result = template.to_string();

        for cap in re.captures_iter(template) {
            println!("cap : {:?}", &cap);
            let command = &cap[1];
            let args = cap.get(2).map_or("", |m| m.as_str());
            if let Some(handler) = self.commands.get(command) {
                let replacement = handler(self, args, context);
                result = result.replace(&cap[0], &replacement);
            }
        }

        // 替换上下文变量
        for (key, value) in context {
            let placeholder = format!("!{}", key);
            result = result.replace(&placeholder, value);
        }

        result
    }
}

#[cfg(test)]
mod tests
