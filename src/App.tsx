import { getCurrent } from '@tauri-apps/api/window';
import './App.css';
import AskWindow from "./AskWindow.tsx";
import ConfigWindow from "./ConfigWindow.tsx";

const windowsMap: Record<string, typeof AskWindow> = {
    ask: AskWindow,
    config: ConfigWindow,
}

function App() {
    let win = getCurrent();

    return <>{windowsMap[win.label]()}</>
}

export default App;
