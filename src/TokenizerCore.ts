import { ScalarState } from "./States/ScalarState";
import { State } from "./States/State";
import { Token } from "./Types";

export class TokenizerCore implements Iterator<Token> {
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