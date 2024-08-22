import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "../styles/FeatureAssistantConfig.css";
import { emit } from "@tauri-apps/api/event";
import ConfigForm from "./ConfigForm";

interface ModelForSelect {
  name: string;
  code: string;
  id: number;
  llm_provider_id: number;
}

type FeatureConfig = Map<string, Map<string, string>>;

interface FeatureConfigListItem {
  id: number;
  feature_code: string;
  key: string;
  value: string;
}

const FeatureAssistantConfig: React.FC = () => {
  // 基础数据
  // 模型数据
  const [models, setModels] = useState<ModelForSelect[]>([]);
  useEffect(() => {
    invoke<Array<ModelForSelect>>("get_models_for_select").then((modelList) => {
      setModels(modelList);
    });
  }, []);

  const [featureConfig, setFeatureConfig] = useState<FeatureConfig>(new Map());
  useEffect(() => {
    invoke<Array<FeatureConfigListItem>>("get_all_feature_config").then(
      (feature_config_list) => {
        for (let feature_config of feature_config_list) {
          let feature_code = feature_config.feature_code;
          let key = feature_config.key;
          let value = feature_config.value;
          if (!featureConfig.has(feature_code)) {
            featureConfig.set(feature_code, new Map());
          }
          featureConfig.get(feature_code)?.set(key, value);
        }
        console.log("init featureConfig", featureConfig);
        setFeatureConfig(new Map(featureConfig));
      },
    );
  }, []);

  const handleConfigChange = (
    feature_code: string,
    key: string,
    value: string | number | boolean,
  ) => {
    let newFeatureConfig = new Map(featureConfig);
    if (!newFeatureConfig.has(feature_code)) {
      newFeatureConfig.set(feature_code, new Map());
    }
    newFeatureConfig.get(feature_code)?.set(key, value.toString());
    setFeatureConfig(newFeatureConfig);
  };

  const handleSave = (feature_code: string) => {
    console.log("save", feature_code, featureConfig.get(feature_code));
    invoke("save_feature_config", {
      featureCode: feature_code,
      config: featureConfig.get(feature_code),
    }).then(() => {
      emit("config-window-success-notification");
    });
  };

  const summaryFormConfig = {
    model: {
      type: "select" as const,
      label: "Model",
      options: models.map((m) => ({
        value: `${m.llm_provider_id}/${m.code}`,
        label: m.name,
      })),
      value: `${featureConfig.get("conversation_summary")?.get("provider_id")}/${featureConfig.get("conversation_summary")?.get("model_code")}`,
      onChange: (value: string | boolean) => {
        const [provider_id, model_code] = (value as string).split("/");
        handleConfigChange("conversation_summary", "provider_id", provider_id);
        handleConfigChange("conversation_summary", "model_code", model_code);
      },
    },
    summary_length: {
      type: "select" as const,
      label: "总结文本长度",
      options: [50, 100, 300, 500, 1000, -1].map((m) => ({
        value: m.toString(),
        label: m === -1 ? "所有" : m.toString(),
      })),
      value:
        featureConfig.get("conversation_summary")?.get("summary_length") + "",
      onChange: (value: string | boolean) =>
        handleConfigChange("conversation_summary", "summary_length", value),
    },
    prompt: {
      type: "textarea" as const,
      label: "Prompt",
      value: featureConfig.get("conversation_summary")?.get("prompt") || "",
      onChange: (value: string | boolean) =>
        handleConfigChange("conversation_summary", "prompt", value),
    },
  };

  const previewFormConfig = {
    previewMode: {
      type: "radio" as const,
      label: "部署方式",
      options: [
        { value: "local", label: "本地" },
        { value: "remote", label: "远程" },
        { value: "service", label: "使用服务" },
      ],
      value: featureConfig.get("preview")?.get("preview_type") || "service",
      onChange: (value: string | boolean) =>
        handleConfigChange("preview", "preview_type", value),
    },
    nextPort: {
      type: "input" as const,
      label: "Next.js端口",
      value: featureConfig.get("preview")?.get("nextjs_port") || "3001",
      onChange: (value: string | boolean) =>
        handleConfigChange("preview", "nextjs_port", value),
    },
    nuxtPort: {
      type: "input" as const,
      label: "Nuxt.js端口",
      value: featureConfig.get("preview")?.get("nuxtjs_port") || "3002",
      onChange: (value: string | boolean) =>
        handleConfigChange("preview", "nuxtjs_port", value),
    },
    authToken: {
      type: "input" as const,
      label: "Auth token",
      value: featureConfig.get("preview")?.get("auth_token") || "",
      onChange: (value: string | boolean) =>
        handleConfigChange("preview", "auth_token", value),
    },
  };

  const shortcutFormConfig = {
    shortcut: {
      type: "input" as const,
      label: "快捷键",
      value: featureConfig.get("shortcut")?.get("key") || "CmdOrCtrl+Shift+I",
      onChange: (value: string | boolean) =>
        handleConfigChange("shortcut", "key", value),
    },
  };

  return (
    <div className="feature-assistant-editor">
      <ConfigForm
        title="对话总结"
        description="对话开始时总结该对话并且生成标题"
        enableExpand={true}
        defaultExpanded={true}
        config={summaryFormConfig}
        layout="prompt"
        classNames="bottom-space"
        onSave={() => handleSave("conversation_summary")}
      />

      <ConfigForm
        title="预览配置"
        description="在大模型编写完react或者vue组件之后，能够快速预览"
        enableExpand={true}
        config={previewFormConfig}
        layout="default"
        classNames="bottom-space"
        onSave={() => handleSave("preview")}
      />

      <ConfigForm
        title="快捷键配置"
        description="配置呼出快捷键"
        enableExpand={true}
        config={shortcutFormConfig}
        layout="default"
        onSave={() => handleSave("shortcut")}
      />
    </div>
  );
};

export default FeatureAssistantConfig;
