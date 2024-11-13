export class Tokenizer implements Iterable<Token> {
    constructor(private readonly text: string) {
    }

    [Symbol.iterator](): Iterator<Token, any, any> {
        return new TokenizerCore(this.text);
    }
}

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

type Location = { line: number, column: number }

enum Indicators {
    DoubleQuote = 0x22,
    SingleQuote = 0x27,
    SequenceEntry = 0x2D,
    MappingKey = 0x3F,
    MappingValue = 0x3A,
    Comment = 0x23,
    CR = 0x0D,
    LF = 0x0A
}

class TokenizerCore implements Iterator<Token> {
    text: string;
    private state!: State;

    constructor(text: string) {
        this.text = text;
        this.transitionTo(new ScalarState(0, undefined, 1, 1));
    }

    next(): IteratorResult<Token, undefined> {
        return this.state.next();
    }

    transitionTo(state: State) {
        this.state = state;
        this.state.setContext(this);
    }
}

abstract class State {
    protected context!: TokenizerCore;

    constructor(protected readonly start: number, protected readonly line: number, protected readonly column: number) { }

    setContext(context: TokenizerCore) {
        this.context = context;
    }

    protected moveNext(state: State): IteratorResult<Token, undefined> {
        this.context.transitionTo(state);
        return this.context.next();
    }

    abstract next(): IteratorResult<Token, undefined>;
}

class ScalarState extends State {
    constructor(readonly start: number, private readonly indent: number | undefined, line: number, column: number) {
        super(start, line, column);
    }

    next(): IteratorResult<Token, undefined> {
        const spans: Array<string> = [];
        const { context: { text, text: { length } } } = this;

        for (let { start: index, start, indent = 0, indent: blockIndent, line, column } = this;
            index < length;
            index++, indent = 0, start = index, line++, column = 1) {

            for (; index < length && isWhiteSpace(text.codePointAt(index)); index++);

            if (index >= length) {
                break;
            }

            // compute effective line indentation
            const padding = index - start;
            indent += padding;
            // capture first line indentation as effective block indentation level if it was not provided explicitely
            // (this.indent property)
            blockIndent = blockIndent || indent;

            const code = text.codePointAt(index);

            // Less indented block detection
            if (indent < blockIndent && !isEOL(code)) {
                this.context.transitionTo(new ScalarState(start, undefined, line, 1));
                return {
                    value: {
                        kind: TokenKind.Scalar, value: fold(),
                        indent: blockIndent, line: this.line, column: this.column
                    }
                };
            }

            // Sequence entry marker detection
            if (code === Indicators.SequenceEntry) {
                if (index + 1 >= length || isWhiteSpaceOrEOL(text.codePointAt(index + 1))) {
                    if (spans.length === 0) {
                        this.context.transitionTo(new ScalarState(index + 1, indent + 1, line, column + padding + 1));
                        return { value: { kind: TokenKind.SequenceEntry, indent, line, column: column + padding } };
                    }

                    this.context.transitionTo(new ScalarState(start, undefined, line, 1));
                    return {
                        value: {
                            kind: TokenKind.Scalar, value: fold(),
                            indent: blockIndent, line: this.line, column: this.column
                        }
                    };
                }

                index++;
            }

            scan_line_loop:
            for (; index < length; index++) {
                switch (text.codePointAt(index)) {
                    case Indicators.LF: {
                        break scan_line_loop;
                    }

                    // Mapping key-value pair detection
                    case Indicators.MappingValue: {
                        if (index + 1 < length && !isWhiteSpaceOrEOL(text.codePointAt(index + 1))) {
                            break;
                        }

                        if (spans.length === 0) {
                            this.context.transitionTo(new ScalarState(index + 1, indent + 1, line, column + index - start + 1));
                            return {
                                value: {
                                    kind: TokenKind.MappingKey, key: text.substring(start, index).trim(),
                                    indent, line, column: column + padding
                                }
                            };
                        }

                        this.context.transitionTo(new ScalarState(start, undefined, line, 1));
                        return {
                            value: {
                                kind: TokenKind.Scalar, value: fold(),
                                indent: blockIndent, line: this.line, column: this.column
                            }
                        };
                    }

                    // Comment line detection
                    case Indicators.Comment: {
                        if (index - 1 > 0 && !isWhiteSpaceOrEOL(text.codePointAt(index - 1))) {
                            break;
                        }

                        this.context.transitionTo(new CommentState(index + 1, line, column + padding));

                        if (spans.length === 0) {
                            return this.context.next();
                        }

                        addSpan(start, index);
                        this.context.transitionTo(new CommentState(index + 1, line, column + padding));
                        return {
                            value: {
                                kind: TokenKind.Scalar, value: fold(),
                                indent: blockIndent, line: this.line, column: this.column
                            }
                        }
                    }
                }
            }

            addSpan(start, index);
        }

        this.context.transitionTo(new FinalState());

        const value = fold();
        return value
            ? {
                value: {
                    kind: TokenKind.Scalar, value,
                    indent: this.indent || 0,
                    line: this.line, column: this.column
                }
            }
            : this.context.next()

        function addSpan(start: number, end: number) {
            const span = text.substring(start, end).trim();
            if (span || spans.length) {
                spans.push(span);
            }
        }

        function fold() {
            return spans.reduce((prev, curent) => prev + (curent ? (prev[prev.length - 1] !== "\n" ? " " : "") + curent : "\n"), "").trim() || null;
        }
    }
}

class CommentState extends State {
    next(): IteratorResult<Token, undefined> {
        const { start, context: { text, text: { length } } } = this;
        let index = start;

        for (; index < length; index++) {
            if (text.codePointAt(index) === Indicators.LF)
                break;
        }

        this.context.transitionTo(new ScalarState(index + 1, undefined, this.line + 1, 1));
        return {
            value: {
                kind: TokenKind.Comment, text: text.substring(start, index).trim(),
                line: this.line, column: this.column
            }
        }
    }
}

class FinalState extends State {
    constructor() {
        super(0, 0, 0);
    }

    next(): IteratorResult<Token, undefined> {
        return { done: true, value: undefined };
    }
}

function isWhiteSpace(code: number | undefined) {
    return code === 0x20 || code === 0x09;
}

function isEOL(code: number | undefined) {
    return code === Indicators.LF || code === Indicators.CR;
}

function isWhiteSpaceOrEOL(code: number | undefined) {
    return code === 0x20 || code === 0x09 || code === Indicators.LF || code === Indicators.CR;
}