import React from 'react';
import '../styles/SideMenu.css';

interface MenuItem {
    id: string;
    name: string;
    icon: string;
}

interface MenuProps {
    menu: Array<MenuItem>;
    selectedMenu: string;
    setSelectedMenu: (menu: string) => void;
}

const SideMenu: React.FC<MenuProps> = ({ menu, selectedMenu, setSelectedMenu }) => {
    return (
        <div className="menu">
            {
                menu.map((item, index) => (
                    <div
                        key={index}
                        className={`menu-item ${selectedMenu === item.id ? 'selected' : ''}`}
                        onClick={() => setSelectedMenu(item.id)}
                    >
                        <img src={item.icon} />
                        <span style={{marginLeft: '14px'}}>{item.name}</span>
                    </div>
                ))
            }
        </div>
    );
}

export default SideMenu;
