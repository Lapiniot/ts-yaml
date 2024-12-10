import { isWhiteSpace, isWhiteSpaceOrEOL } from "../Helpers";
import { Indicators, Token, TokenKind, YamlFoldString } from "../Types";
import { ScalarState } from "./ScalarState";
import { State } from "./State";

export class SingleQuoteScalarState extends State {
    constructor(readonly start: number, private readonly indent: number, line: number, column: number) {
        super(start, line, column);
    }

    next(): IteratorResult<Token, undefined> {
        const spans = new YamlFoldString();
        const { context: { text, text: { length } } } = this;

        for (let { start: index, start, indent, line, column } = this; index < length; line++, start = index) {
            scan_line_loop: for (; index < length; index++) {
                const code = text.charCodeAt(index);
                switch (code) {
                    case Indicators.SingleQuote:
                        if (index + 1 < length && text.charCodeAt(index + 1) === Indicators.SingleQuote) {
                            spans.append(text.substring(start, ++index));
                            start = index + 1;
                        } else {
                            spans.append(text.substring(start, index));
                            if (line == this.line) {
                                for (; index < length - 1 && isWhiteSpace(text.codePointAt(index + 1)); index++);
                                if (text.charCodeAt(index) === Indicators.Colon
                                    && (index + 1 >= length || isWhiteSpaceOrEOL(text.charCodeAt(index + 1)))) {
                                    this.context.transitionTo(new ScalarState(index + 1, indent + 1, line, index - start + indent + 2));
                                    return { value: { kind: TokenKind.MappingKey, key: spans.toString(), indent, line, column } };
                                }
                            }

                            this.context.transitionTo(new ScalarState(index + 1, undefined, line, column));
                            return { value: { kind: TokenKind.Scalar, value: spans.toString(), indent, line, column } };
                        }
                        break;

                    case Indicators.CR:
                        spans.appendLine(text.substring(start, index++));
                        if (text.charCodeAt(index) === Indicators.LF)
                            index++;
                        break scan_line_loop;

                    case Indicators.LF:
                        spans.appendLine(text.substring(start, index++));
                        break scan_line_loop;
                }
            }

            // skip all leading whitespace chars for next line
            for (; index < length && isWhiteSpace(text.codePointAt(index)); index++);
        }

        this.Throw("Unexpected end of character sequence within single-quoted scalar", this.line, this.column);
    }
}