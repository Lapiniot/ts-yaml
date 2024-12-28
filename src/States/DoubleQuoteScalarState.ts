import { isWhiteSpace, isWhiteSpaceOrEOL } from "../Helpers";
import { YamlFoldingStringBuilder } from "../StringBuilder";
import { ScalarState } from "./ScalarState";
import { Indicators, State, Token, TokenKind } from "./State";

export class DoubleQuoteScalarState extends State {
    constructor(readonly start: number, private readonly indent: number, line: number, column: number) {
        super(start, line, column);
    }

    next(): IteratorResult<Token, undefined> {
        const sb = new YamlFoldingStringBuilder();
        const { context: { text, text: { length } } } = this;

        for (let { start: index, start, indent, line, column } = this; index < length; line++, start = index) {
            scan_line_loop:
            for (; index < length; index++) {
                const code = text.charCodeAt(index);
                switch (code) {
                    case Indicators.DoubleQuote:
                        sb.append(text.substring(start, index));
                        if (line == this.line) {
                            for (; index < length - 1 && isWhiteSpace(text.codePointAt(index + 1)); index++);
                            if (text.charCodeAt(index) === Indicators.Colon
                                && (index + 1 >= length || isWhiteSpaceOrEOL(text.charCodeAt(index + 1)))) {
                                this.context.transitionTo(new ScalarState(index + 1, indent + 1, line, index - start + indent + 2));
                                return { value: { kind: TokenKind.MappingKey, key: sb.toString(), indent, line, column } };
                            }
                        }

                        this.context.transitionTo(new ScalarState(index + 1, undefined, line, column));
                        return { value: { kind: TokenKind.Scalar, value: sb.toString(), indent, line, column } };

                    case Indicators.Backslash:
                        sb.append(text.substring(start, index));
                        const [unescaped, consumed] = parseEscaped(text, index + 1);
                        if (Number.isNaN(unescaped))
                            this.throw("Invalid escape sequence", line, column);
                        sb.append(String.fromCodePoint(unescaped));
                        index += consumed;
                        start = index + 1;
                        break;

                    case Indicators.CR:
                        sb.appendLine(text.substring(start, index++));
                        if (text.charCodeAt(index) === Indicators.LF)
                            index++;
                        break scan_line_loop;

                    case Indicators.LF:
                        sb.appendLine(text.substring(start, index++));
                        break scan_line_loop;
                }
            }

            // skip all leading whitespace chars for next line
            for (; index < length && isWhiteSpace(text.codePointAt(index)); index++);
        }

        this.throw("Unexpected end of character sequence within double-quoted scalar", this.line, this.column);
    }
}

function parseEscaped(str: string, index: number): [code: number, consumed: number] {
    switch (str.charCodeAt(index)) {
        case 0x30: return [0x00, 1];                            //      \0  null
        case 0x61: return [0x07, 1];                            //      \a  bell
        case 0x62: return [0x08, 1];                            //      \b  backspace
        case 0x74: return [0x09, 1];                            //      \t  horizontal tab
        case 0x6e: return [0x0a, 1];                            //      \n  line feed
        case 0x76: return [0x0b, 1];                            //      \v  vertical tab
        case 0x66: return [0x0c, 1];                            //      \f  form feed
        case 0x72: return [0x0d, 1];                            //      \r  carriage return
        case 0x65: return [0x1b, 1];                            //      \e  escape
        case 0x22: return [0x22, 1];                            //      \"  double quote
        case 0x2f: return [0x2f, 1];                            //      \/ slash
        case 0x5c: return [0x5c, 1];                            //      \\  back slash
        case 0x4e: return [0x85, 1];                            //      \N  Unicode next line
        case 0x5f: return [0xa0, 1];                            //      \_  Unicode non-breaking space
        case 0x4c: return [0x2028, 1];                          //      \L  Unicode line separator 
        case 0x50: return [0x2029, 1];                          //      \P  Unicode paragraph separator
        case 0x78: return parseHex(str, index + 1, 2);          //      x[Hex]{2}   Escaped 8-bit Unicode character
        case 0x75: return parseHex(str, index + 1, 4);          //      x[Hex]{4}   Escaped 16-bit Unicode character
        case 0x55: return parseHex(str, index + 1, 8);          //      x[Hex]{8}   Escaped 32-bit Unicode character
    }

    return [NaN, 0];
}

function parseHex(str: string, index: number, numChars: number): ReturnType<typeof parseEscaped> {
    const sequence = str.substring(index, index + numChars);
    if (sequence.length !== numChars) return [Number.NaN, 0];
    const num = Number.parseInt(sequence, 16);
    return [num, Number.isNaN(num) ? 0 : numChars + 1];
}