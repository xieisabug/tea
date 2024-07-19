import React, {useEffect, useState} from 'react';
import "./AssistantConfig.css";
import {invoke} from "@tauri-apps/api/tauri";

interface AssistantListItem {
    id: number;
    name: string;
}

interface ModelForSelect {
    name: string;
    code: string;
    id: number;
    llmProviderId: number;
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
        invoke<Array<FeatureConfigListItem>>("get_all_feature_config").then((feature_config_list) => {
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
        });
    })

    const handleConfigChange = (feature_code: string, key: string, value: string | number | boolean) => {
        let newFeatureConfig = new Map(featureConfig);
        if (!newFeatureConfig.has(feature_code)) {
            newFeatureConfig.set(feature_code, new Map());
        }
        newFeatureConfig.get(feature_code)?.set(key, value.toString());
        setFeatureConfig(newFeatureConfig);
    };

    const handleSave = (feature_code: string) => {
        console.log("save", feature_code, featureConfig.get(feature_code));
        invoke("save_feature_config", { featureCode: feature_code, config: featureConfig.get(feature_code) });
    };

    return (
        <div className="feature-assistant-editor">
            <div className="assistant-config">
                <h1>对话总结</h1>
                <span>对话开始时总结该对话并且生成标题</span>
                <form>
                    <div className="config-grid">

                        <div>
                            <span>模型</span>
                            <select value={featureConfig.get('conversation_summary')?.get('model_id')}
                                    onChange={(e) => {
                                        handleConfigChange('conversation_summary', 'model_id', e.target.value);
                                        console.log(e.target.value)
                                    }
                            }>
                                <option value="">请选择模型</option>
                                {models.map((model) => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                            </select>
                            <div className="config-item">
                                <label>总结文本长度</label>
                                <select value={featureConfig.get('conversation_summary')?.get('summary_length')}
                                        onChange={(e) => {
                                            handleConfigChange('conversation_summary', 'summary_length', e.target.value);
                                        }
                                }>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="300">300</option>
                                    <option value="500">500</option>
                                    <option value="1000">1000</option>
                                    <option value="-1">所有</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <span>Prompt</span>
                            <textarea value={featureConfig.get('conversation_summary')?.get('prompt')}
                                        onChange={(e) => {
                                            handleConfigChange('conversation_summary', 'prompt', e.target.value);
                                        }}></textarea>
                            <button className="save-button" type="button" onClick={() => handleSave('conversation_summary')}>保存</button>

                        </div>
                    </div>
                </form>

            </div>

        </div>
    );
};

export default FeatureAssistantConfig;