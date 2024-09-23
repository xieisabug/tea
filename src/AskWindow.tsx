import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import "./styles/AskWindow.css";
import ReactMarkdown, { Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";

import UpArrow from "./assets/up-arrow.svg?react";
import Stop from "./assets/stop.svg?react";
import Copy from "./assets/copy.svg?react";
import Ok from "./assets/ok.svg?react";
import OpenFullUI from "./assets/open-fullui.svg?react";
import Setting from "./assets/setting.svg?react";
import AskWindowPrepare from "./components/AskWindowPrepare";
import AskAIHint from "./components/AskAIHint";
import IconButton from "./components/IconButton";
import { throttle } from "lodash";
import { writeText } from "@tauri-apps/api/clipboard";
import CodeBlock from "./components/CodeBlock";

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}
interface CustomComponents extends Components {
    antthinking: React.ElementType;
}

function AskWindow() {
    const [query, setQuery] = useState<string>("");
    const [response, setResponse] = useState<string>("");
    const [messageId, setMessageId] = useState<number>(-1);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [aiIsResponsing, setAiIsResponsing] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [bangListVisible, setBangListVisible] = useState<boolean>(false);
    const [bangList, setBangList] = useState<string[]>([]);

    const [cursorPosition, setCursorPosition] = useState<{
        top: number;
        left: number;
    }>({ top: 0, left: 0 });
    const [selectedBangIndex, setSelectedBangIndex] = useState<number>(0);

    let unsubscribe: Promise<() => void> | null = null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (e.shiftKey) {
                // Shift + Enter for new line
                return;
            } else if (bangListVisible) {
                // Select bang
                e.preventDefault();
                const selectedBang = bangList[selectedBangIndex];
                setQuery((prevQuery) =>
                    prevQuery.replace(/![^!]*$/, `${selectedBang[0]} `),
                );
                setBangListVisible(false);
            } else {
                // Enter for submit
                e.preventDefault();
                handleSubmit();
            }
        } else if (e.key === "Tab" && bangListVisible) {
            // Select bang
            e.preventDefault();
            const selectedBang = bangList[selectedBangIndex];
            setQuery((prevQuery) =>
                prevQuery.replace(/![^!]*$/, `${selectedBang[0]} `),
            );
            setBangListVisible(false);
        } else if (e.key === "ArrowUp" && bangListVisible) {
            e.preventDefault();
            setSelectedBangIndex((prevIndex) =>
                prevIndex > 0 ? prevIndex - 1 : bangList.length - 1,
            );
        } else if (e.key === "ArrowDown" && bangListVisible) {
            e.preventDefault();
            setSelectedBangIndex((prevIndex) =>
                prevIndex < bangList.length - 1 ? prevIndex + 1 : 0,
            );
        } else if (e.key === "!") {
            const textarea = e.currentTarget as HTMLTextAreaElement;
            const cursorPosition = textarea.selectionStart;
            // 获取光标位置的坐标
            const cursorCoords = getCaretCoordinates(textarea, cursorPosition);

            // 获取文本区域的位置信息
            const rect = e.currentTarget.getBoundingClientRect();
            // 计算bang列表的位置
            const left = rect.left + cursorCoords.left + cursorCoords.width;
            const top = rect.top + cursorCoords.top + cursorCoords.height;

            setCursorPosition({ top, left });
            setBangListVisible(true);
            setSelectedBangIndex(0);
        } else if (!e.key.match(/[a-zA-Z0-9]/)) {
            setBangListVisible(false);
        }
    };

    // 辅助函数：获取光标坐标
    function getCaretCoordinates(
        element: HTMLTextAreaElement,
        position: number,
    ) {
        const div = document.createElement("div");
        const style = div.style;
        const computed = window.getComputedStyle(element);

        style.whiteSpace = "pre-wrap";
        style.wordWrap = "break-word";
        style.position = "absolute";
        style.visibility = "hidden";

        // 复制文本区域的样式
        for (const prop of [
            "direction",
            "boxSizing",
            "width",
            "height",
            "overflowX",
            "overflowY",
            "borderTopWidth",
            "borderRightWidth",
            "borderBottomWidth",
            "borderLeftWidth",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
            "fontStyle",
            "fontVariant",
            "fontWeight",
            "fontStretch",
            "fontSize",
            "fontSizeAdjust",
            "lineHeight",
            "fontFamily",
            "textAlign",
            "textTransform",
            "textIndent",
            "textDecoration",
            "letterSpacing",
            "wordSpacing",
        ]) {
            style[prop as any] = computed[prop as any];
        }

        // 计算光标位置
        const text = element.value.substring(0, position);
        const span = document.createElement("span");
        span.textContent = text;
        div.appendChild(span);

        document.body.appendChild(div);
        const coordinates = {
            left: span.offsetLeft,
            top: span.offsetTop,
            height: span.offsetHeight,
            width: span.offsetWidth,
        };
        document.body.removeChild(div);

        return coordinates;
    }

    const handleSubmit = () => {
        if (aiIsResponsing) {
            return;
        }
        setAiIsResponsing(true);
        setResponse("");
        try {
            invoke<AiResponse>("ask_ai", {
                request: {
                    prompt: query,
                    conversation_id: "",
                    assistant_id: 1,
                },
            }).then((res) => {
                setMessageId(res.add_message_id);

                console.log("ask ai response", res);
                if (unsubscribe) {
                    console.log("Unsubscribing from previous event listener");
                    unsubscribe.then((f) => f());
                }

                console.log(
                    "Listening for response",
                    `message_${res.add_message_id}`,
                );
                unsubscribe = listen(
                    `message_${res.add_message_id}`,
                    (event) => {
                        const payload = event.payload as string;
                        if (payload !== "Tea::Event::MessageFinish") {
                            setResponse(payload);
                        } else {
                            setAiIsResponsing(false);
                        }
                    },
                );
            });
        } catch (error) {
            console.error("Error:", error);
            setResponse("An error occurred while processing your request.");
        }
    };

    const onSend = throttle(() => {
        if (aiIsResponsing) {
            console.log("Cancelling AI");
            invoke("cancel_ai", { messageId }).then(() => {
                setAiIsResponsing(false);
            });
        } else {
            console.log("Sending query to AI");
            handleSubmit();
        }
    }, 200);

    useEffect(() => {
        const handleShortcut = async (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                console.log("Closing window");
                await appWindow.hide();
            } else if (event.key === "i" && event.ctrlKey) {
                await openChatUI();
                await appWindow.hide();
            }
        };

        if (inputRef.current) {
            inputRef.current.focus();
        }

        window.addEventListener("keydown", handleShortcut);

        return () => {
            window.removeEventListener("keydown", handleShortcut);
            if (unsubscribe) {
                unsubscribe.then((f) => f());
            }
        };
    }, []);

    useEffect(() => {
        if (!query.endsWith("!")) {
            setBangListVisible(false);
        }
    }, [query]);

    const openConfig = async () => {
        await invoke("open_config_window");
    };

    const openChatUI = async () => {
        await invoke("open_chat_ui_window");
    };

    const handleArtifact = useCallback((lang: string, inputStr: string) => {
        invoke("run_artifacts", { lang, inputStr }).then((res) => {
            console.log(res);
        });
    }, []);

    useEffect(() => {
        invoke<string[]>("get_bang_list").then((bangList) => {
            setBangList(bangList);
        });
    }, []);

    return (
        <div className="ask-window">
            <div className="chat-container" data-tauri-drag-region>
                <div className="ask-window-chat-form">
                    <textarea
                        className="ask-window-input"
                        ref={inputRef}
                        value={query}
                        onKeyDown={handleKeyDown}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setQuery(e.target.value)
                        }
                        placeholder="Ask AI..."
                    ></textarea>
                    <button
                        className="ask-window-submit-button"
                        type="button"
                        onClick={onSend}
                    >
                        {aiIsResponsing ? (
                            <Stop fill="white" />
                        ) : (
                            <UpArrow fill="white" />
                        )}
                    </button>
                </div>
                <div className="response">
                    {messageId !== -1 ? (
                        response == "" ? (
                            <AskAIHint />
                        ) : (
                            <ReactMarkdown
                                children={response}
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={
                                    {
                                        code({
                                            node,
                                            className,
                                            children,
                                            ref,
                                            ...props
                                        }) {
                                            const match = /language-(\w+)/.exec(
                                                className || "",
                                            );
                                            return match ? (
                                                <CodeBlock
                                                    language={match[1]}
                                                    onCodeRun={handleArtifact}
                                                >
                                                    {String(children).replace(
                                                        /\n$/,
                                                        "",
                                                    )}
                                                </CodeBlock>
                                            ) : (
                                                <code
                                                    {...props}
                                                    ref={ref}
                                                    className={className}
                                                >
                                                    {children}
                                                </code>
                                            );
                                        },
                                        antthinking({ children }) {
                                            return (
                                                <div>
                                                    <div
                                                        className="llm-thinking-badge"
                                                        title={children}
                                                        data-thinking={children}
                                                    >
                                                        思考...
                                                    </div>
                                                </div>
                                            );
                                        },
                                    } as CustomComponents
                                }
                            />
                        )
                    ) : (
                        <AskWindowPrepare />
                    )}
                </div>
                <div className="tools" data-tauri-drag-region>
                    {messageId !== -1 && !aiIsResponsing ? (
                        <IconButton
                            icon={
                                copySuccess ? (
                                    <Ok fill="black" />
                                ) : (
                                    <Copy fill="black" />
                                )
                            }
                            onClick={() => {
                                writeText(response);
                                setCopySuccess(true);
                                setTimeout(() => {
                                    setCopySuccess(false);
                                }, 1500);
                            }}
                        />
                    ) : null}

                    <IconButton
                        icon={<OpenFullUI fill="black" />}
                        onClick={openChatUI}
                    />
                    <IconButton
                        icon={<Setting fill="black" />}
                        onClick={openConfig}
                    />
                </div>
                {bangListVisible && (
                    <div
                        className="completion-bang-list"
                        style={{
                            top: cursorPosition.top,
                            left: cursorPosition.left,
                        }}
                    >
                        {bangList.map(([bang, desc], index) => (
                            <div
                                className={`completion-bang-container ${index === selectedBangIndex ? "selected" : ""}`}
                                key={bang}
                                onClick={() => {
                                    setQuery((prevQuery) =>
                                        prevQuery.replace(
                                            /![^!]*$/,
                                            `${bang} `,
                                        ),
                                    );
                                    setBangListVisible(false);
                                }}
                            >
                                <span className="bang-tag">{bang}</span>
                                <span>{desc}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AskWindow;
