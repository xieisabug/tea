import React, { useState } from 'react';
import './LLMProviderConfig.css';

const LLMProviderConfigForm: React.FC = () => {
    const [endpoint, setEndpoint] = useState<string>('');
    const [modelList, setModelList] = useState<string>('');
    const [apiKey, setApiKey] = useState<string>('');

    const getModelList = async () => {

    }

    return (
        <div className="provider-config">
            <div className="form-group">
                <label>Endpoint:</label>
                <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>API Key:</label>
                <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Model List:</label>
                <button onClick={getModelList}>获取</button>
                <input
                    type="text"
                    value={modelList}
                    onChange={(e) => setModelList(e.target.value)}
                />
            </div>
        </div>
    );
}

export default LLMProviderConfigForm;
