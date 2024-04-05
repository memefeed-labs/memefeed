// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertObjectKeysToCamelCase = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => convertObjectKeysToCamelCase(item));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newKey = convertToCamelCase(key);
            const value = obj[key];
            newObj[newKey] = (value instanceof Date) ? value : convertObjectKeysToCamelCase(value);
        }
    }

    return newObj;
}


function convertToCamelCase(snakeCaseString: string): string {
    return snakeCaseString.replace(/_([a-z])/g, (match, char) =>
        char.toUpperCase()
    );
}

export {
    convertObjectKeysToCamelCase
};
