import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";


function PreviewHTMLWindow() {
    const [html, setHtml] = useState<string>("");
    useEffect(() => {
        listen<string>("preview_html", (e) => {
            console.log(e);
            setHtml(e.payload);
        });
        emit("preview-window-load");
    }, []);
    return (
        <div dangerouslySetInnerHTML={{__html: html}}></div>
    );
}

export default PreviewHTMLWindow;