import React, {useEffect, useState} from 'react';
import {invoke} from "@tauri-apps/api/tauri";
import CustomSelect from './CustomSelect';
import RoundButton from './RoundButton';
import '../styles/FeatureAssistantConfig.css';

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
    }, [])

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
            <div className="config-window-container">
                <div className='config-window-title'>
                    <div className='config-window-title-text-container'>
                        <span className='config-window-title-name'>对话总结</span>
                        <span className='config-window-title-description'>对话开始时总结该对话并且生成标题</span>    
                    </div>                      
                </div>
                
                <form className='config-window-form'>
                    <div className="feature-assistant-config-grid">
                        <div className='feature-assistant-properties'>
                            <div className='form-group'>
                                <label>model</label>
                                <CustomSelect options={models.map(m => ({value: m.id + "", label: m.name}))} value={featureConfig.get('conversation_summary')?.get('model_id') + ""} onChange={(v) => {
                                    handleConfigChange('conversation_summary', 'model_id', v);
                                }} />
                                
                            </div>
                            
                            <div className="form-group">
                                <label>总结文本长度</label>
                                <CustomSelect options={[50, 100, 300, 500, 1000, -1].map(m => ({value: m + "", label: m === -1 ? "所有": (m + "")}))} 
                                        value={featureConfig.get('conversation_summary')?.get('summary_length') + ""} 
                                        onChange={(v) => {
                                            handleConfigChange('conversation_summary', 'summary_length', v);
                                        }} 
                                />
                            </div>
                        </div>
                        <div className='feature-assistant-prompts'>
                            <span>prompt</span>
                            <textarea 
                                className='form-textarea feature-assistant-prompt-textarea'
                                value={featureConfig.get('conversation_summary')?.get('prompt')}
                                onChange={(e) => {
                                    handleConfigChange('conversation_summary', 'prompt', e.target.value);
                                }}></textarea>

                        </div>
                    </div>
                    <div>
                        <RoundButton primary text='保存' onClick={() => handleSave('conversation_summary')} />
                    </div>
                    
                </form>

            </div>

        </div>
    );
};

export default FeatureAssistantConfig;