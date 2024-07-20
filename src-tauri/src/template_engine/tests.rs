use super::*;
use chrono::Local;

#[test]
fn test_parse_current_date() {
    let result = TemplateEngine::new().parse("test !current_date test", &HashMap::new());
    println!("result : {}", result);
    assert_eq!(result.contains(&Local::now().format("%Y-%m-%d").to_string()), true);
}

#[test]
fn test_parse_sub_start() {
    let result = TemplateEngine::new().parse("test !sub_start( '123123123123', 3 ) test", &HashMap::new());
    println!("result : {}", result);
    assert_eq!(result, "test 123 test");
}