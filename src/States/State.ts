import { TokenizerCore } from "../TokenizerCore";
import { Token, TokenKind, Indicators } from "../Types";

export abstract class State {
    protected context!: TokenizerCore;

    constructor(protected readonly start: number, protected readonly line: number, protected readonly column: number) { }

    setContext(context: TokenizerCore) {
        this.context = context;
    }

    protected throw(message: string, line: number, column: number): never {
        throw new Error(`${message} at (Ln ${line}, Col ${column}).`);
    }

    public abstract next(): IteratorResult<Token, undefined>;
}

export { Token, TokenKind, Indicators }