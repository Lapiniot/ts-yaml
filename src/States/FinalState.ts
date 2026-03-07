import { State, type Token } from "./State.js";

export class FinalState extends State {
    constructor() {
        super(0, 0, 0);
    }

    next(): IteratorResult<Token, undefined> {
        return { done: true, value: undefined };
    }
}