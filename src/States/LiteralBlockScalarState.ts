import { isEOL, isWhiteSpace } from "../Helpers";
import { LiteralBlockClipModeStringBuilder, LiteralBlockKeepModeStringBuilder, LiteralBlockStripModeStringBuilder, StringBuilder } from "../StringBuilder";
import { FinalState } from "./FinalState";
import { ScalarState } from "./ScalarState";
import { Indicators, State, Token, TokenKind } from "./State";

export class LiteralBlockScalarState extends State {
    constructor(readonly start: number, private readonly indent: number, line: number, column: number) {
        super(start, line, column);
    }

    public next(): IteratorResult<Token, undefined> {
        let { start: index, start, context: { text, text: { length } }, line, column, indent: blockIndent } = this;
        let contentIndent: number | undefined = undefined;
        let sb: StringBuilder;

        // #region Parse block header

        let code = text.charCodeAt(index);
        if (code >= 0x31 && code <= 0x39) {
            contentIndent = blockIndent + (code - 0x30);
            index++;
        }

        code = text.charCodeAt(index);
        if (code === 0x2b) {
            sb = new LiteralBlockKeepModeStringBuilder();
            index++;
        } else if (code === 0x2d) {
            sb = new LiteralBlockStripModeStringBuilder();
            index++;
        }

        if (contentIndent === undefined) {
            code = text.charCodeAt(index);
            if (code >= 0x31 && code <= 0x39) {
                contentIndent = blockIndent + (code - 0x30);
                index++;
            }
        }

        for (start = index; index < length && isWhiteSpace(text.charCodeAt(index)); index++);

        if (index > start) {
            // there might be valid comment present here
            code = text.charCodeAt(index);
            if (code === Indicators.Hash) {
                // strip one-line comment
                for (index++; index < length && !isEOL(text.charCodeAt(index)); index++);
            }
        }

        if (index >= length) {
            this.context.transitionTo(new FinalState());
            return { value: { kind: TokenKind.Scalar, value: "", indent: blockIndent, line, column } };
        }

        switch (text.charCodeAt(index)) {
            case Indicators.CR:
                index++;
                if (text.charCodeAt(index) !== Indicators.LF)
                    break;
            case Indicators.LF:
                index++;
                break;
            default:
                this.ThrowInvalidLiteralBlockScalar(line, column);
        }

        sb ??= new LiteralBlockClipModeStringBuilder();

        // #endregion
        line++, start = index;

        for (let maxEmptyLineIndent = 0; index < length; index++, line++, start = index) {
            if (contentIndent === undefined) {
                // Detect content indentation
                for (; index < length && isWhiteSpace(text.charCodeAt(index)); index++);
                const padding = index - start;
                if (!isEOL(text.charCodeAt(index))) {
                    // First non-empty line
                    if (padding < blockIndent) {
                        this.context.transitionTo(new ScalarState(start, undefined, line, column));
                        return { value: { kind: TokenKind.Scalar, value: "", indent: blockIndent, line, column } };
                    } else if (padding < maxEmptyLineIndent) {
                        // Spec: "It is an error for any of the leading empty 
                        // lines to contain more spaces than the first non-empty line"
                        this.ThrowInvalidLiteralBlockScalar(this.line, this.column);
                    } else {
                        contentIndent = padding;
                    }
                } else {
                    maxEmptyLineIndent = Math.max(maxEmptyLineIndent, padding);
                }
            } else {
                const limit = Math.min(index + contentIndent, length);
                for (; index < limit && isWhiteSpace(text.charCodeAt(index)); index++);
                const padding = index - start;
                if (!isEOL(text.charCodeAt(index))) {
                    if (padding < blockIndent) {
                        this.context.transitionTo(new ScalarState(start, undefined, line, column));
                        return { value: { kind: TokenKind.Scalar, value: sb.toString(), indent: blockIndent, line: this.line, column: this.column } }
                    } else if (padding < contentIndent) {
                        // Spec: "It is an error if any non-empty line does not begin with a number of spaces 
                        // greater than or equal to the content indentation level"
                        this.ThrowInvalidLiteralBlockScalar(this.line, this.column);
                    }
                }
            }

            let offset = 0;
            scan_line:
            for (start = index; index < length; index++) {
                switch (text.charCodeAt(index)) {
                    case Indicators.CR:
                        if (text.charCodeAt(index + 1) === Indicators.LF) {
                            index++;
                            offset = -1;
                        }
                    case Indicators.LF:
                        break scan_line;
                }
            }

            sb.appendLine(text.substring(start, index + offset))
        }

        const value = sb.toString();
        this.context.transitionTo(new ScalarState(index, undefined, line, column));
        return { value: { kind: TokenKind.Scalar, value, indent: blockIndent, line: this.line, column: this.column } };
    }

    private ThrowInvalidLiteralBlockScalar(line: number, column: number) {
        this.Throw("Invalid literal block scalar", line, column);
    }
}