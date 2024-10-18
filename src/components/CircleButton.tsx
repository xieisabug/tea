import { ReactNode } from 'react';
import '../styles/CircleButton.css';

interface CircleButtonProps {
    primary?: boolean;
    size?: 'mini' | 'small' | 'medium' | 'large';
    icon: ReactNode;
    onClick: () => void;
    className?: string;
    type?: 'submit' | 'button';
}

const CircleButton: React.FC<CircleButtonProps> = ({ primary, icon, type, onClick, className, size }) => {
    return <button onClick={onClick} className={'circle-button ' + (primary ? ' bg-primary ' : '') + ' ' + (size ? size : 'medium') + ' ' + (className ? className : '')} type={type ? type : 'button'}>
        {icon}
    </button>
}

export default CircleButton;