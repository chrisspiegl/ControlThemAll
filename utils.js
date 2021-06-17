export const asArray = (x) => Array.isArray(x) ? x : [x]

export const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2
