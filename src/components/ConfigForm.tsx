import React, { useState, useEffect, useRef } from "react";
import CustomSelect from "./CustomSelect";
import RoundButton from "./RoundButton";
import IconButton from "./IconButton";
import Copy from "../assets/copy.svg?react";
import Delete from "../assets/delete.svg?react";
import Edit from "../assets/edit.svg?react";
import "../styles/ConfigForm.css";

interface ConfigField {
  type:
    | "select"
    | "textarea"
    | "input"
    | "password"
    | "checkbox"
    | "radio"
    | "static"
    | "custom"
    | "button"; // 添加 "button" 类型
  label: string;
  options?: { value: string; label: string; tooltip?: string }[];
  value: string | boolean;
  tooltip?: string;
  onChange?: (value: string | boolean) => void;
  onBlur?: (value: string | boolean) => void;
  customRender?: () => React.ReactNode;
  onClick?: () => void; // 为按钮添加 onClick 处理函数
}

interface ConfigFormProps {
  title: string;
  description?: string;
  config: Record<string, ConfigField>;
  classNames?: string;
  // 是否可展开
  enableExpand?: boolean;
  // 是否默认展开
  defaultExpanded?: boolean;
  /**
   * default 直接从上向下展示所有的配置项
   * prompt 会单独将prompt配置项放在右侧
   * provider 会单独将modelList配置项放在右侧
   */
  layout?: "default" | "prompt" | "provider";
  onSave?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  extraButtons?: React.ReactNode;
}

const ConfigForm: React.FC<ConfigFormProps> = ({
  title,
  description,
  config,
  classNames,
  enableExpand = false,
  defaultExpanded = false,
  layout = "default",
  onSave,
  onCopy,
  onDelete,
  onEdit,
  extraButtons,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      const handleTransitionEnd = () => {
        if (isExpanded) {
          content.style.overflow = "visible";
        }
      };
      const handleTransitionStart = () => {
        if (!isExpanded) {
          content.style.overflow = "hidden";
        }
      };
      content.addEventListener("transitionend", handleTransitionEnd);
      content.addEventListener("transitionstart", handleTransitionStart);

      return () => {
        content.removeEventListener("transitionend", handleTransitionEnd);
        content.removeEventListener("transitionstart", handleTransitionStart);
      };
    }
  }, [isExpanded]);

  useEffect(() => {
    const content = contentRef.current;

    if (content) {
      if (isExpanded) {
        content.style.overflow = "visible";
      } else {
        content.style.overflow = "hidden";
      }
    }
  }, []);

  const renderFormField = (_: string, field: ConfigField) => {
    switch (field.type) {
      case "select":
        return (
          <CustomSelect
            options={field.options || []}
            value={field.value as string}
            onChange={(value: string) =>
              field.onChange && field.onChange(value)
            }
          />
        );
      case "textarea":
        return (
          <textarea
            className="form-textarea feature-assistant-prompt-textarea"
            value={field.value as string}
            onChange={(e) => field.onChange && field.onChange(e.target.value)}
          />
        );
      case "input":
      case "password":
        return (
          <input
            className="form-input"
            type={field.type}
            value={field.value as string}
            onChange={(e) => field.onChange && field.onChange(e.target.value)}
            onBlur={(e) => field.onBlur && field.onBlur(e.target.value)}
          />
        );
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={field.value as boolean}
            onChange={(e) => field.onChange && field.onChange(e.target.checked)}
          />
        );
      case "radio":
        return (
          <div className="radio-group">
            {field.options?.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  value={option.value}
                  checked={field.value === option.value}
                  onChange={() =>
                    field.onChange && field.onChange(option.value)
                  }
                />
                {option.label}

                {option.tooltip && (
                  <span className="tooltip-trigger" title={field.tooltip}>
                    ?
                  </span>
                )}
              </label>
            ))}
          </div>
        );
      case "static":
        return <span>{field.value}</span>;
      case "custom":
        return field.customRender ? field.customRender() : null;
      case "button":
        return (
          <RoundButton primary text={field.value as string} onClick={() => {
            field.onClick && field.onClick();
          }} />
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (layout) {
      case "prompt":
        return (
          <div className="assistant-config-grid">
            <div className="assistant-config-properties">
              {Object.entries(config)
                .filter((k) => k[0] !== "prompt")
                .map(([key, field]) => (
                  <div className="form-group" key={key}>
                    <label>{field.label}</label>
                    {renderFormField(key, field)}
                  </div>
                ))}
            </div>
            {config.prompt && (
              <div className="assistant-config-prompts">
                <div>Prompt</div>
                {renderFormField("prompt", config.prompt)}
              </div>
            )}
          </div>
        );
      case "provider":
        return (
          <div className="provider-config-item-form">
            <div className="provider-config-item-form-property-container">
              {Object.entries(config).map(([key, field]) => (
                <div className="form-group" key={key}>
                  <label>{field.label}</label>
                  {renderFormField(key, field)}
                </div>
              ))}
            </div>
            {config.modelList && (
              <div className="provider-config-item-form-model-list-container">
                {renderFormField("modelList", config.modelList)}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div>
            {Object.entries(config).map(([key, field]) => (
              <div className="form-group" key={key}>
                <label>{field.label}</label>
                {renderFormField(key, field)}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div
      className={
        classNames
          ? classNames + " config-window-container"
          : "config-window-container"
      }
    >
      <div
        className="config-window-title"
        onClick={toggleExpand}
        style={{ cursor: "pointer" }}
      >
        <div className="config-window-title-text-container">
          <span
            className={
              enableExpand
                ? `config-window-title-name-enable-expand ${isExpanded ? "expanded" : ""}`
                : "config-window-title-name"
            }
            title={title}
          >
            {title}
          </span>
          {description && (
            <span
              className="config-window-title-description"
              title={description}
            >
              {description}
            </span>
          )}
        </div>
        {(onCopy || onDelete || onEdit || extraButtons) && (
          <div className="config-window-icon-button-group">
            {onCopy && (
              <IconButton icon={<Copy fill="white" />} onClick={onCopy} />
            )}
            {onDelete && (
              <IconButton icon={<Delete fill="white" />} onClick={onDelete} />
            )}
            {onEdit && (
              <IconButton icon={<Edit fill="white" />} onClick={onEdit} />
            )}
            {extraButtons}
          </div>
        )}
      </div>

      <div
        ref={contentRef}
        className={`config-window-content ${isExpanded ? "expanded" : ""}`}
      >
        <form className="config-window-form">
          {renderContent()}
          {onSave && (
            <div>
              <RoundButton primary text="保存" onClick={onSave} />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ConfigForm;
