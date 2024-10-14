import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import RoundButton from "./RoundButton";
import IconButton from "./IconButton";
import Copy from "../assets/copy.svg?react";
import Delete from "../assets/delete.svg?react";
import Edit from "../assets/edit.svg?react";
import "../styles/ConfigForm.css";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Form } from "./ui/form";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Input } from "./ui/input";

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
	defaultExpanded = true,
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
		if (enableExpand) {
			setIsExpanded(!isExpanded);
		}
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
					<Select
						value={field.value as string}
						onValueChange={(value: string) =>
							field.onChange && field.onChange(value)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder={field.label} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			case "textarea":
				return (
					<Textarea
						className="form-textarea feature-assistant-prompt-textarea"
						value={field.value as string}
						onChange={(e) => field.onChange && field.onChange(e.target.value)}
					/>
				);
			case "input":
			case "password":
				return (
					<Input
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
					<RadioGroup
						value={field.value as string}
						onValueChange={(value: string) =>
							field.onChange && field.onChange(value)
						}
					>
						{field.options?.map((option) => (
							<div key={option.value} className="flex items-center space-x-2">
								<RadioGroupItem value={option.value} id={option.value} />
								<label htmlFor={option.value}>{option.label}</label>
								{option.tooltip && (
									<span className="tooltip-trigger" title={field.tooltip}>
										?
									</span>
								)}
							</div>
						))}
					</RadioGroup>
				);
			case "static":
				return <span>{field.value}</span>;
			case "custom":
				return field.customRender ? field.customRender() : null;
			case "button":
				return (
					<Button onClick={() => {
						field.onClick && field.onClick();
					}}>{field.value as string}</Button>
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

	const form = useForm();

	return (
		<Card className={classNames ? classNames + " config-window-container" : "config-window-container"}>
			<CardHeader onClick={toggleExpand} style={{ cursor: "pointer" }}>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>

			<CardContent ref={contentRef} className={`config-window-content ${isExpanded ? "expanded" : ""}`}>
				<Form {...form}>
					{renderContent()}
					{onSave && (
						<div>
							<Button type="submit" onClick={onSave}>保存</Button>
						</div>
					)}
				</Form>
			</CardContent>

			{(onCopy || onDelete || onEdit || extraButtons) && (
				<CardFooter>
					{onCopy && <IconButton icon={<Copy fill="white" />} onClick={onCopy} />}
					{onDelete && <IconButton icon={<Delete fill="white" />} onClick={onDelete} />}
					{onEdit && <IconButton icon={<Edit fill="white" />} onClick={onEdit} />}
					{extraButtons}
				</CardFooter>
			)}
		</Card >
	);
};

export default ConfigForm;
