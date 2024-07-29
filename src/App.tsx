import { getCurrent } from '@tauri-apps/api/window';
import './App.css';
import AskWindow from "./AskWindow.tsx";
import ConfigWindow from "./ConfigWindow.tsx";
import ChatUIWindow from './ChatUIWindow.tsx';
import PreviewHTMLWindow from './PreviewHTMLWindow.tsx';

const windowsMap: Record<string, typeof AskWindow> = {
    ask: AskWindow,
    config: ConfigWindow,
    "chat_ui": ChatUIWindow,
    preview_html: PreviewHTMLWindow
}

function App() {
    let win = getCurrent();

    return <>{windowsMap[win.label]()}</>
}

export default App;
