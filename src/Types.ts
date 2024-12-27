export enum TokenKind {
    Scalar,
    MappingKey,
    SequenceEntry,
    Comment
}

export type Token = Location & (
    { kind: TokenKind.Comment, text: string } |
    { kind: TokenKind.Scalar, value: string | null, indent: number } |
    { kind: TokenKind.MappingKey, key: string, indent: number } |
    { kind: TokenKind.SequenceEntry, indent: number }
)

export type Location = { line: number, column: number }

export enum Indicators {
    DoubleQuote = 0x22,
    SingleQuote = 0x27,
    Hyphen = 0x2d,
    Colon = 0x3a,
    Hash = 0x23,
    CR = 0x0d,
    LF = 0x0a,
    Backslash = 0x5c,
    VerticalBar = 0x7c,
    GreaterThan = 0x3e
}