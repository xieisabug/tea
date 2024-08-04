import { ReactNode } from 'react';
import '../styles/CircleButton.css';

interface CircleButtonProps {
    primary?: boolean;
    icon: ReactNode;
    onClick: () => void;
    className?: string;
    type?: 'submit' | 'button';
}

const CircleButton: React.FC<CircleButtonProps> = ({primary, icon, type, onClick, className}) => {
    return <button onClick={onClick} className={'circle-button ' + (primary? ' primary ': '') + (className? className: '')} type={type? type: 'button'}>
        {icon}
    </button>
}

export default CircleButton;