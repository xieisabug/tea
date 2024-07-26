const AskWindowPrepare: React.FC = () => {
    return <div className="ask-window-prepare">
    <p>输入文本后回车，与快捷对话助手进行交流</p>
    <p>拖拽或者粘贴文件/图片后，可与快捷对话助手根据文件进行交流</p>
    <p>对话中可以使用以下!bang命令：</p>
    <div className="bang-list">
        <div className="bang-container">
            <span className="bang-tag">!s</span>
            <span>插入选择的文字</span>
        </div>
        <div className="bang-container">
            <span className="bang-tag">!cd</span>
            <span>插入当前日期文本</span>
        </div>
        <div className="bang-container">
            <span className="bang-tag">!ct</span>
            <span>插入当前时间文字</span>
        </div>
    </div>
</div>
}

export default AskWindowPrepare;