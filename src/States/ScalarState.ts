import { isEOL, isWhiteSpace, isWhiteSpaceOrEOL } from "../Helpers";
import { YamlFoldingStringBuilder } from "../StringBuilder";
import { CommentState } from "./CommentState";
import { DoubleQuoteScalarState } from "./DoubleQuoteScalarState";
import { FinalState } from "./FinalState";
import { LiteralBlockScalarState } from "./LiteralBlockScalarState";
import { SingleQuoteScalarState } from "./SingleQuoteScalarState";
import { Indicators, State, Token, TokenKind } from "./State";

export class ScalarState extends State {
    constructor(readonly start: number, private readonly expectedIndent: number | undefined, line: number, column: number) {
        super(start, line, column);
    }

    next(): IteratorResult<Token, undefined> {
        const sb = new YamlFoldingStringBuilder();
        const { context: { text, text: { length } } } = this;

        scan_loop:
        for (let { start: index, start, expectedIndent: indent = 0, expectedIndent: blockIndent, line, column } = this; index < length; index++, indent = 0, start = index, line++, column = 1) {
            for (; index < length && isWhiteSpace(text.codePointAt(index)); index++);

            if (index >= length) {
                break;
            }

            const code = text.codePointAt(index);

            // compute effective line indentation
            const padding = index - start;
            indent += padding;
            // capture first line indentation as effective block indentation level if it was not provided explicitely
            // (this.indent property)
            blockIndent = blockIndent || indent;

            // Less indented block detection
            if (indent < blockIndent && !isEOL(code)) {
                this.context.transitionTo(new ScalarState(start, undefined, line, 1));
                return {
                    value: {
                        kind: TokenKind.Scalar, value: sb.toString().trim() || null,
                        indent: blockIndent, line: this.line, column: this.column
                    }
                };
            }

            // Check for special markers that can change parsing mode, unless spans list already contains some accumulated 
            // meaningful text (this basically means we are already parsing regular scalar text)
            if (sb.isEmpty) {
                // Sequence entry marker detection
                switch (code) {
                    case Indicators.Hyphen:
                        if (index + 1 >= length || isWhiteSpaceOrEOL(text.codePointAt(index + 1))) {
                            this.context.transitionTo(new ScalarState(index + 1, indent + 1, line, column + padding + 1));
                            return { value: { kind: TokenKind.SequenceEntry, indent, line, column: column + padding } };
                        }
                        index++;
                        break;
                    case Indicators.SingleQuote:
                        this.context.transitionTo(new SingleQuoteScalarState(index + 1, indent, line, column + padding));
                        return this.context.next();
                    case Indicators.DoubleQuote:
                        this.context.transitionTo(new DoubleQuoteScalarState(index + 1, indent, line, column + padding))
                        return this.context.next();
                    case Indicators.VerticalBar:
                        this.context.transitionTo(new LiteralBlockScalarState(index + 1, indent, line, column + padding));
                        return this.context.next();
                }
            }

            for (; index < length; index++) {
                switch (text.codePointAt(index)) {
                    case Indicators.CR: {
                        const value = text.substring(start, index).trim();
                        if (value || !sb.isEmpty)
                            sb.appendLine(value);
                        if (text.charCodeAt(index + 1) === Indicators.LF)
                            index++;
                        continue scan_loop;
                    }

                    case Indicators.LF: {
                        const value = text.substring(start, index).trim();
                        if (value || !sb.isEmpty)
                            sb.appendLine(value);
                        continue scan_loop;
                    }

                    // Mapping key-value pair detection
                    case Indicators.Colon: {
                        if (index + 1 < length && !isWhiteSpaceOrEOL(text.codePointAt(index + 1))) {
                            break;
                        }

                        if (sb.isEmpty) {
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
                                kind: TokenKind.Scalar, value: sb.toString().trim() || null,
                                indent: blockIndent, line: this.line, column: this.column
                            }
                        };
                    }

                    // Comment line detection
                    case Indicators.Hash: {
                        if (index - 1 > 0 && !isWhiteSpaceOrEOL(text.codePointAt(index - 1))) {
                            break;
                        }

                        this.context.transitionTo(new CommentState(index + 1, line, column + padding));

                        if (sb.isEmpty) {
                            return this.context.next();
                        }

                        sb.append(text.substring(start, index).trim());
                        this.context.transitionTo(new CommentState(index + 1, line, column + padding));
                        return {
                            value: {
                                kind: TokenKind.Scalar, value: sb.toString().trim(),
                                indent: blockIndent, line: this.line, column: this.column
                            }
                        };
                    }
                }
            }

            sb.append(text.substring(start, index).trim());
        }

        this.context.transitionTo(new FinalState());

        const value = sb.toString().trim() || null;
        if (value === null && this.expectedIndent === undefined) {
            // value == null - means we havn't parsed anything meaningful (only presentation
            // level whitespaces or empty lines e.g.)
            // expectedIndent == undefined - means we started parsing at arbitrary poisition without 
            // any strict expecation of some meaningful value content being present.
            // Thus, we shouldn't even return null-value token to the parser in this case.
            return this.context.next();
        }

        return {
            value: {
                kind: TokenKind.Scalar, value,
                indent: this.expectedIndent || 0,
                line: this.line, column: this.column
            }
        }
    }
}