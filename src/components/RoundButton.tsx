import '../styles/RoundButton.css';

interface RoundButtonProps {
    primary?: boolean;
    onClick: () => void;
    className?: string;
    text: string;
    type?: 'submit' | 'button';
}

const RoundButton: React.FC<RoundButtonProps> = ({primary, type, text, onClick, className}) => {
    return <button onClick={onClick} className={'round-button ' + (primary? ' primary ': '') + (className? className: '')} type={type? type: 'button'}>
        {text}
    </button>
}

export default RoundButton;