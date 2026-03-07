import { ScalarState } from "./states/ScalarState.js";
import { State, type Token } from "./states/State.js";

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