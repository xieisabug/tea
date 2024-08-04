import { ReactNode, MouseEventHandler, FunctionComponent } from 'react';
import '../styles/IconButton.css';

interface IconButtonProps {
    icon: ReactNode;
    onClick: MouseEventHandler<HTMLButtonElement>;
    className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({icon, onClick, className}) => {
    return <button onClick={onClick} className={'icon-button ' + (className? className: '')}>
        {icon}
    </button>
}

export default IconButton;