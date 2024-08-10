import { ReactNode, MouseEventHandler } from 'react';
import '../styles/IconButton.css';

interface IconButtonProps {
    icon: ReactNode;
    onClick: MouseEventHandler<HTMLButtonElement>;
    className?: string;
    border?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({icon, onClick, className, border}) => {
    return <button onClick={onClick} className={'icon-button ' + (className? className: '') + (border ? " border-icon-button": "")}>
        {icon}
    </button>
}

export default IconButton;