import '../styles/CircleButton.css';

interface CircleButtonProps {
    primary?: boolean;
    icon: string;
    onClick: () => void;
    className?: string;
    type?: 'submit' | 'button';
}

const CircleButton: React.FC<CircleButtonProps> = ({primary, icon, type, onClick, className}) => {
    return <button onClick={onClick} className={'circle-button ' + (primary? ' primary ': '') + (className? className: '')} type={type? type: 'button'}>
        <img src={icon} alt={type? type: 'button'} width="16" height="16" />
    </button>
}

export default CircleButton;