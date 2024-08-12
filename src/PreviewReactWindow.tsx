import { emit, listen } from "@tauri-apps/api/event";
import React, { ReactNode, useEffect, useState } from "react";
import { transform } from '@babel/standalone';

function removeImportsAndExports(code: string): { code: string, componentName: string } {
  // 获取 export default 后面的组件名称
  const exportDefaultRegex = /export\s+default\s+(\w+)/;
  const match = code.match(exportDefaultRegex);
  const componentName = match ? match[1] : 'Component';

  // 移除所有 import 语句和 export default 语句
  const cleanedCode = code.replace(/^\s*import\s+.*?[\r\n]+/gm, '')
                          .replace(exportDefaultRegex, '');

  return { code: cleanedCode, componentName };
}

function injectCSS(cssContent: string) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(cssContent));
    document.head.appendChild(style);
}

function PreviewReactWindow() {
    const [component, setComponent] = useState<ReactNode | null>(null);

    useEffect(() => {
        const handleEvent = async (e: { payload: string }) => {
            console.log(e);
            let payload = JSON.parse(e.payload);
            let { code, css } = payload;

            try {
                // 注入 CSS 内容
                injectCSS(css);

                // 移除所有 import 语句和 export default 语句，并获取组件名称
                const { code: cleanedCode, componentName } = removeImportsAndExports(code);

                // 使用 Babel 转换代码
                const compiledCode = transform(cleanedCode, {
                    presets: [
                        ['env', { modules: false }],
                        'react'
                    ],
                    plugins: ['transform-react-jsx'],
                    filename: 'file.jsx',
                    sourceType: 'module'
                }).code;

                // 创建一个函数来动态执行代码
                const createComponent = (code: string|undefined|null, componentName: string) => {
                    if (!code) {
                        return null;
                    }
                    const func = new Function('React', 'useState', `
                        ${code}
                        return typeof ${componentName} !== 'undefined' ? ${componentName} : null;
                    `);
                    return func(React, useState);
                };

                // 创建组件
                const DynamicComponent = createComponent(compiledCode, componentName);

                // 设置组件状态
                setComponent(DynamicComponent ? <DynamicComponent /> : <div>No component found</div>);
            } catch (error) {
                console.error('Failed to compile and render component:', error);
                setComponent(<div>Error: Failed to render component</div>);
            }
        };

        listen<string>("preview_react", handleEvent);
        emit("preview-window-load");

        // 清理监听器
        return () => {
            listen<string>("preview_react", handleEvent);
        };
    }, []);

    return (
        <div>
            {component}
        </div>
    );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: any) {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return <div>Error: Something went wrong</div>;
        }

        return this.props.children;
    }
}

function PreviewReactWindowWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.7/base.min.css" rel="stylesheet"></link>
            <PreviewReactWindow />
        </ErrorBoundary>
    );
}

export default PreviewReactWindowWithErrorBoundary;