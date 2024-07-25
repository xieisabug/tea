import React from 'react';
import '../styles/Switch.css'; // 引入样式文件

interface SwitchProps {
    state?: boolean;
    onChange?: () => void;
}

const Switch: React.FC<SwitchProps> = ({ state = false, onChange }) => {

    const handleToggle = () => {
        if (onChange) {
            onChange();
        }
    };

    return (
        <div className={`switch ${state ? 'on' : 'off'}`} onClick={handleToggle}>
            <div className="slider"></div>
        </div>
    );
};

export default Switch;