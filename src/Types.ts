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
    SequenceEntry = 0x2d,
    Dash = 0x3f,
    Colon = 0x3a,
    Comment = 0x23,
    CR = 0x0d,
    LF = 0x0a,
    Backslash = 0x5c
}

/**
 * From the YAML spec:
 * 6.5. Line Folding
 * Line folding allows long lines to be broken for readability, while retaining the semantics of the original long line.
 * If a line break is followed by an empty line, it is trimmed; the first line break is discarded
 * and the rest are retained as content.
 * Otherwise (the following line is not empty), the line break is converted to a single space (x20).
 */
export class YamlFoldString {
    // Allow storing null elements and treat them as explicit 
    // line end marker instead of "\n" strings.
    // This allows plain "\n" characters to be preserved and 
    // not folded (from escape sequence in quoted string e.g.)
    private spans: (string | null)[] = [];

    public append(span: string): void {
        if (span === "") return;
        this.spans.push(span);
    }

    public appendLine(span: string = "") {
        this.append(span);
        this.spans.push(null);
    }

    public toString(): string {
        return this.spans.reduce((prev, current, index, arr) => prev +
            (current === null
                ? arr[index - 1] !== null
                    ? arr[index + 1] !== null
                        ? " "
                        : ""
                    : "\n"
                : current), "") as string;
    }

    public get isEmpty() {
        return this.spans.length === 0;
    }
}