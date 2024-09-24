use chrono::Local;
use futures::future::BoxFuture;
use futures::FutureExt;
use htmd;
use regex::Regex;
use reqwest;
use std::collections::HashMap;

// 定义命令处理函数类型
type CommandFn = fn(TemplateEngine, String, HashMap<String, String>) -> BoxFuture<'static, String>;

// 获取当前日期的命令处理函数
fn current_date(
    _: TemplateEngine,
    _: String,
    _: HashMap<String, String>,
) -> BoxFuture<'static, String> {
    async { Local::now().format("%Y-%m-%d").to_string() }.boxed()
}

// 获取当前时间的命令处理函数
fn current_time(
    _: TemplateEngine,
    _: String,
    _: HashMap<String, String>,
) -> BoxFuture<'static, String> {
    async { Local::now().format("%H:%M:%S").to_string() }.boxed()
}

// 截取指定长度字符的命令处理函数
fn sub_start(
    engine: TemplateEngine,
    input: String,
    context: HashMap<String, String>,
) -> BoxFuture<'static, String> {
    async move {
        println!("input : {}", input);
        let re = Regex::new(r"\((.*),(\d+)\)").unwrap();
        for cap in re.captures_iter(&input) {
            println!("cap : {:?}", &cap);
            let text_origin = &cap[1];
            let num = &cap[2];

            let text = engine.parse(text_origin.trim(), &context).await;
            if let Ok(count) = num.trim().parse::<usize>() {
                return text.chars().take(count).collect();
            }
        }
        String::new()
    }
    .boxed()
}

fn selected_text(
    _: TemplateEngine,
    _: String,
    context: HashMap<String, String>,
) -> BoxFuture<'static, String> {
    async move {
        context
            .get("selected_text")
            .unwrap_or(&String::default())
            .to_string()
    }
    .boxed()
}

// 新增获取屏幕截图的函数
fn screen(
    _: TemplateEngine,
    _: String,
    context: HashMap<String, String>,
) -> BoxFuture<'static, String> {
    async move {
        context
            .get("screen")
            .unwrap_or(&String::default())
            .to_string()
    }
    .boxed()
}

// 新增获取网页内容的函数
fn web(_: TemplateEngine, url: String, _: HashMap<String, String>) -> BoxFuture<'static, String> {
    async move {
        // 移除url中前后的括号
        let url = url.trim_start_matches('(').trim_end_matches(')');

        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap();

        match client.get(url).send().await {
            Ok(response) => {
                let html = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Failed to get web content".to_string());
                format!("\n<bangweb url=\"{}\">\n{}\n</bangweb>", url, html)
            }
            Err(err) => err.to_string(),
        }
    }
    .boxed()
}

// 新增获取网页内容并转换为 Markdown 的函数
fn web_to_markdown(
    _: TemplateEngine,
    url: String,
    _: HashMap<String, String>,
) -> BoxFuture<'static, String> {
    async move {
        // 移除url中前后的括号
        let url = url.trim_start_matches('(').trim_end_matches(')');

        let client = reqwest::Client::new();
        match client.get(url).send().await {
            Ok(response) => {
                let html = response.text().await.unwrap_or_default();
                format!(
                    "\n<bangwebtomarkdown url=\"{}\">\n{}\n</bangwebtomarkdown>",
                    url,
                    htmd::convert(&html).unwrap()
                )
            }
            Err(_) => "".to_string(),
        }
    }
    .boxed()
}

// 模板解析器结构体
#[derive(Clone)]
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
    pub async fn parse(&self, template: &str, context: &HashMap<String, String>) -> String {
        let re = Regex::new(r"[!！](\w+)(\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*\))*\))*\))*\))*\))*\))*\))?").unwrap();
        let mut result = template.to_string();

        for cap in re.captures_iter(template) {
            println!("cap : {:?}", &cap);
            let command = &cap[1];
            let args = cap.get(2).map_or("", |m| m.as_str());
            if let Some(handler) = self.commands.get(command) {
                let replacement = handler(self.clone(), args.to_string(), context.clone()).await;
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
mod tests;
