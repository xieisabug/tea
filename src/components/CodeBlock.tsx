import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import React, { useState, useCallback, useEffect } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
// srcery   railscasts   nnfx-dark    atelier-estuary-dark
import { srcery } from "react-syntax-highlighter/dist/esm/styles/hljs";
import IconButton from "./IconButton";
import Ok from "../assets/ok.svg?react";
import Copy from "../assets/copy.svg?react";
import Run from "../assets/run.svg?react";

const CodeBlock = React.memo(({ language, children, onCodeRun }: { language: string, children: string, onCodeRun: (lang: string, code: string) => void }) => {
    const [copyIconState, setCopyIconState] = useState<'copy' | 'ok'>('copy');

    const handleCopy = useCallback(() => {
        const code = String(children).replace(/\n$/, '');
        writeText(code);
        setCopyIconState('ok');
    }, [children]);

    useEffect(() => {
        if (copyIconState === 'ok') {
            const timer = setTimeout(() => {
                setCopyIconState('copy');
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [copyIconState]);

    return (
        <div className="message-code-container">
            <div className="message-code-button-group">
                <IconButton
                    icon={copyIconState === 'copy' ? <Copy fill="black"/> : <Ok fill="black" />}
                    onClick={handleCopy}
                />
                <IconButton icon={<Run fill="black" />} onClick={() => onCodeRun(language, String(children).replace(/\n$/, ''))} />
            </div>
            <SyntaxHighlighter
                PreTag="div"
                children={String(children).replace(/\n$/, '')}
                language={language}
                style={srcery}
            />
        </div>
    );
});

export default CodeBlock;