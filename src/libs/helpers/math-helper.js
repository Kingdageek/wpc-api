export const roundDecimal = (decimalVal, decimalPlaces=2) => {
    const tenToPower = Math.pow(10, decimalPlaces);
    return Math.round((decimalVal + Number.EPSILON) * tenToPower) / tenToPower;
};