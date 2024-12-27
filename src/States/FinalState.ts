import { State, Token } from "./State";

export class FinalState extends State {
    constructor() {
        super(0, 0, 0);
    }

    next(): IteratorResult<Token, undefined> {
        return { done: true, value: undefined };
    }
}