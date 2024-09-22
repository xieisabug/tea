const AskWindowPrepare: React.FC = () => {
    return <div className="ask-window-prepare" data-tauri-drag-region>
    <p data-tauri-drag-region>输入文本后回车，与快捷对话助手进行交流</p>
    <p data-tauri-drag-region>拖拽或者粘贴文件/图片后，可与快捷对话助手根据文件进行交流</p>
    <p data-tauri-drag-region>对话中可以使用以下!bang命令：</p>
    <div className="bang-list" data-tauri-drag-region>
        <div className="bang-container" data-tauri-drag-region>
            <span className="bang-tag">!s</span>
            <span data-tauri-drag-region>插入选择的文字</span>
        </div>
        <div className="bang-container" data-tauri-drag-region>
            <span className="bang-tag">!cd</span>
            <span data-tauri-drag-region>插入当前日期文本</span>
        </div>
        <div className="bang-container" data-tauri-drag-region>
            <span className="bang-tag">!ct</span>
            <span data-tauri-drag-region>插入当前时间文字</span>
        </div>
        <div className="bang-container" data-tauri-drag-region>
            <span className="bang-tag">!sc</span>
            <span data-tauri-drag-region>插入屏幕截图</span>
        </div>
        <div className="bang-container" data-tauri-drag-region>
            <span className="bang-tag">!w(url)</span>
            <span data-tauri-drag-region>插入网页内容</span>
        </div>
        <div className="bang-container" data-tauri-drag-region>
            <span className="bang-tag">!wm(url)</span>
            <span data-tauri-drag-region>插入网页内容并转换为Markdown</span>
        </div>
    </div>
</div>
}

export default AskWindowPrepare;
