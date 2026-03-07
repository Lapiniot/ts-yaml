import { isEOL } from "../Helpers.js";
import { ScalarState } from "./ScalarState.js";
import { State, type Token, TokenKind } from "./State.js";

export class CommentState extends State {
    next(): IteratorResult<Token, undefined> {
        const { start, context: { text, text: { length } } } = this;
        let index = start;

        for (; index < length; index++) {
            if (isEOL(text.codePointAt(index)))
                break;
        }

        this.context.transitionTo(new ScalarState(index + 1, undefined, this.line + 1, 1));
        return {
            value: {
                kind: TokenKind.Comment, text: text.substring(start, index).trim(),
                line: this.line, column: this.column
            }
        };
    }
}