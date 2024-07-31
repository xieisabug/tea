import React from 'react';
import '../styles/AlertDialog.css';

interface AlertDialogProps {
    alertText: string;
    alertType: 'success' | 'warning' | 'error';
    isOpen: boolean;
    onClose: () => void;
}

export interface AlertDialogParam {
    text: string;
    type: 'success' | 'warning' | 'error';
}

const AlertDialog: React.FC<AlertDialogProps> = ({ alertText, alertType, isOpen, onClose }) => {
    if (!isOpen) return null;

    const getAlertTitle = () => {
        switch (alertType) {
            case 'success':
                return '成功';
            case 'warning':
                return '警告';
            case 'error':
                return '错误';
            default:
                return '提示';
        }
    };

    return (
        <div className="alert-dialog-overlay">
            <div className={`alert-dialog ${alertType}`}>
                <h2 className="alert-dialog-title">{getAlertTitle()}</h2>
                <p className="alert-dialog-text">{alertText}</p>
                <div className="alert-dialog-actions">
                    <button onClick={onClose} className="alert-dialog-button cancel">确定</button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;