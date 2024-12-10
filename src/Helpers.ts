export function isWhiteSpace(code: number | undefined) {
    return code === 0x20 || code === 0x09;
}

export function isEOL(code: number | undefined) {
    return code === 0x0A || code === 0x0D;
}

export function isWhiteSpaceOrEOL(code: number | undefined) {
    return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0D;
}