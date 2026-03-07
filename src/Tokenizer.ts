import { TokenizerCore } from "./TokenizerCore.js";
import { type Token, TokenKind } from "./Types.js";

export class Tokenizer implements Iterable<Token> {
    constructor(private readonly text: string) {
    }

    [Symbol.iterator](): Iterator<Token, any, any> {
        return new TokenizerCore(this.text);
    }
}

export { type Token, TokenKind }