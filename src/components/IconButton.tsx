import { MouseEventHandler } from 'react';
import '../styles/IconButton.css';

interface IconButtonProps {
    icon: string;
    onClick: MouseEventHandler<HTMLButtonElement>;
    className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({icon, onClick, className}) => {
    return <button onClick={onClick} className={'icon-button ' + (className? className: '')}>
        <img src={icon} alt='button' width="16" height="16" />
    </button>
}

export default IconButton;