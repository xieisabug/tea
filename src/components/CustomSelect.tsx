import React, { useState, useRef, useEffect } from 'react';
import '../styles/CustomSelect.css'; // 引入样式文件

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(options);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };

  }, []);

  const handleSelectClick = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (value: string) => {
    console.log(value)
    onChange(value);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="custom-select" ref={selectRef}>
      <div className={`select-selected ${isOpen ? 'select-arrow-active' : ''}`} onClick={handleSelectClick} title={selectedOption?.label}>
        {selectedOption?.label}
      </div>
      {isOpen && (
        <div className="select-items">
          {options.map(option => (
            <div
              key={option.value}
              className={option.value === value ? 'same-as-selected' : ''}
              onClick={() => handleOptionClick(option.value)}
              title={option.label}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;