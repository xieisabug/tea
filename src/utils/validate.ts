// 验证表单配置输入是否有效
const validateConfig = (value: any, type: string): { isValid: boolean, parsedValue: any } => {
    let isValid = true;
    let parsedValue = value;

    switch (type) {
        case 'boolean':
            isValid = typeof value === 'boolean';
            break;
        case 'string':
            isValid = typeof value === 'string';
            break;
        case 'number':
            if (typeof value !== 'string') {
                isValid = false;
            } else if (/^\d+$/.test(value)) {
                const num = parseInt(value, 10);
                isValid = !isNaN(num) && Number.isInteger(num) && num >= 0;
                parsedValue = isValid ? num : value;
            } else if (value === "") {
                parsedValue = 0;
            } else {
                isValid = false;
            }
            break;
        case 'float':
            if (typeof value !== 'string') {
                isValid = false;
            } else {
                isValid = /^-?\d*\.?\d*$/.test(value);
            }
            break;
        default:
            isValid = false;
    }
    
    console.log("验证结果：", isValid ? "有效" : "无效", "解析后的值：", parsedValue);

    return { isValid, parsedValue };
};

export { validateConfig };
