const filterInt = (value: any, defaultValue?: number): number => {
    if (typeof value === "number" && Number.isInteger(value)) {
        return value
    }
    else if (/^[0-9]+$/.test(value)) {
        return Number(value)
    }
    else {
        return (defaultValue !== undefined) ? defaultValue : NaN
    }
}

export { filterInt }