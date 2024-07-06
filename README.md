# Tea

一个支持插件的高自由度对话客户端 

# TODO
- [x] 快捷键能够快速呼出，并且能够读取选中的文本
- [ ] 正常聊天
- [ ] 支持bang，比如 !g 就是用gpt回答， !c 就是用claude回答，!o 就是本地ollama，!s 就是选择的文本，!p 就是复制的文本 
- [ ] 多llm配置
- [ ] 高自由度配置prompt
- [ ] 支持插件系统，并且编写第一个插件（多llm同时回答对比）
- [ ] 可以自己写js函数，提供一些内置的函数比如调用大模型，展示到界面等，用js的方式来完成高级工作流
- [ ] 大模型配置可以新增自定义参数，选择加到json里还是header里还是query里

### 想做的插件
- 类似artifacts的直接展示编写的网页
- 能够利用python和duckdb的自动生成小工具的程序
- 多llm同时回答对比
- 用代码定义工作流
- 对话框展示插件，能展示图片，表格，文本，语音等