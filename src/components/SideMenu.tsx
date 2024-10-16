import React, { ReactNode } from 'react';
import '../styles/SideMenu.css';

interface MenuItem {
    id: string;
    name: string;
    icon: ReactNode;
    iconSelected: ReactNode;
}

interface MenuProps {
    menu: Array<MenuItem>;
    selectedMenu: string;
    setSelectedMenu: (menu: string) => void;
}

const SideMenu: React.FC<MenuProps> = ({ menu, selectedMenu, setSelectedMenu }) => {
    return (
        <nav className="menu grid gap-6 text-sm text-muted-foreground h-fit p-10">
            {
                menu.map((item, index) => (
                    <a
                        key={index}
                        className={`cursor-pointer ${selectedMenu === item.id ? 'font-semibold text-primary' : 'hover:text-primary'}`}
                        onClick={() => setSelectedMenu(item.id)}
                    >
                        {selectedMenu === item.id ? item.iconSelected : item.icon}
                        <span style={{ marginLeft: '14px' }}>{item.name}</span>
                    </a>
                ))
            }
        </nav>
    );
}

export default SideMenu;
