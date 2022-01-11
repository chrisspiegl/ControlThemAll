export const asArray = x => Array.isArray(x) ? x : [x];

export function map(value, x1, y1, x2, y2) {
	return (((value - x1) * (y2 - x2)) / (y1 - x1)) + x2;
}

export const getEnumByValue = (myEnum, enumValue) => {
	const keys = Object.keys(myEnum).filter(x => myEnum[x] === enumValue);
	return keys.length > 0 ? keys[0] : null;
};
