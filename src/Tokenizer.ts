import { TokenizerCore } from "./TokenizerCore";
import { Token, TokenKind } from "./Types";

export class Tokenizer implements Iterable<Token> {
    constructor(private readonly text: string) {
    }

    [Symbol.iterator](): Iterator<Token, any, any> {
        return new TokenizerCore(this.text);
    }
}

export { Token, TokenKind }