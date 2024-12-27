import { Token, Tokenizer, TokenKind } from "./Tokenizer";

export default class {
    private constructor() { }

    static parse(text: string): any {
        const context = new Context();
        for (const token of new Tokenizer(text)) {
            context.handle(token);
        }

        return context.node;
    }
}

class Context {
    private state!: State;
    readonly mapEntries: Record<string, any>[];
    readonly seqEntries: any[][];
    readonly enterState: State<Record<string, any>>;

    constructor() {
        this.mapEntries = [];
        this.seqEntries = [];
        this.transitionTo(this.enterState = new ConstructMappingState({ root: null }, 'root', -1));
    }

    get node() {
        return this.enterState.node["root"];
    }

    transitionTo(state: State<unknown>) {
        this.state = state;
        this.state.setContext(this);
    }

    handle(token: Token) {
        this.state.handle(token);
    }
}

abstract class State<T = unknown> {
    context!: Context;

    constructor(public readonly node: T) {
    }

    setContext(context: Context) {
        this.context = context;
    }

    abstract handle(token: Token): void;
}

class ConstructMappingState extends State<Record<string, any>> {
    constructor(node: Record<string, any>, private key: string, private indent: number) {
        super(node);
    }

    handle(token: Token): void {
        switch (token.kind) {
            case TokenKind.Scalar:
                if (token.indent > this.indent) {
                    const current = this.node[this.key];
                    if (current !== undefined && current !== null) {
                        throw new Error(`Scalar value is not expected at this position (Ln ${token.line}, Col ${token.column})`);
                    }

                    this.node[this.key] = token.value;
                } else {
                    // throw
                }
                break;
            case TokenKind.MappingKey:
                {
                    const { indent, key, column: col, line: ln } = token;
                    if (indent > this.indent) {
                        if (this.node[this.key]) {
                            throw new Error(`Mapping key is not expected at this position (Ln ${ln}, Col ${col})`);
                        }

                        this.context.transitionTo(new ConstructMappingState(this.context.mapEntries[indent] = this.node[this.key] = {}, key, indent));
                    } else {
                        const node = this.context.mapEntries[indent];
                        if (node) {
                            node[key] = null;
                            this.context.transitionTo(new ConstructMappingState(node, key, indent));
                        }
                    }
                }; break;
            case TokenKind.SequenceEntry:
                {
                    const { indent } = token;
                    if (indent >= this.indent) {
                        this.context.transitionTo(new SequenceExpectValueOrNewMapping(this.context.seqEntries[indent] = this.node[this.key] = [], indent));
                    } else {
                        const node = this.context.seqEntries[indent];
                        if (node) {
                            this.context.transitionTo(new SequenceExpectValueOrNewMapping(node, indent));
                        }
                    }
                }; break;
            case TokenKind.Comment: break;
        }
    }
}

class SequenceExpectValueOrNewMapping extends State<any[]> {
    constructor(node: any[], private indent: number) {
        super(node);
    }

    handle(token: Token): void {
        switch (token.kind) {
            case TokenKind.Scalar:
                this.node.push(token.value);
                this.context.transitionTo(new SequenceExpectEntryOrNewMapping(this.node, this.indent));
                break;
            case TokenKind.MappingKey:
                {
                    const { indent, key } = token;
                    if (indent > this.indent) {
                        const value = {};
                        this.node.push(value);
                        this.context.mapEntries[indent] = value;
                        this.context.transitionTo(new ConstructMappingState(value, key, indent));
                    } else {
                        const node = this.context.mapEntries[indent];
                        if (node) {
                            node[key] = null;
                            this.context.transitionTo(new ConstructMappingState(node, key, indent));
                        } else {
                            throw new Error(`Mapping should not start at this position (Ln ${token.line}, Col ${token.column})`);
                        }
                    }
                }; break;
            case TokenKind.Comment: break;
            case TokenKind.SequenceEntry: {
                const { indent, line, column } = token;
                if (indent >= this.indent) {
                    const value: any[] = [];
                    this.node.push(value);
                    this.context.transitionTo(new SequenceExpectValueOrNewMapping(this.context.seqEntries[indent] = value, indent));
                } else {
                    throw new Error(`Unexpected TokenKind.SequenceEntry at this indentation level (${line},${column}).`);
                }
            } break;
        }
    }
}

class SequenceExpectEntryOrNewMapping extends State<any[]> {
    constructor(node: any[], private indent: number) {
        super(node);
    }

    handle(token: Token): void {
        switch (token.kind) {
            case TokenKind.Scalar:
                throw new Error("Unexpected state (TokenKind.Scalar)");
            case TokenKind.MappingKey:
                {
                    const { indent, key } = token;
                    if (indent > this.indent) {
                        const value = {};
                        this.node.push(value);
                        this.context.mapEntries[indent] = value;
                        this.context.transitionTo(new ConstructMappingState(value, key, indent));
                    } else {
                        const node = this.context.mapEntries[indent];
                        if (node) {
                            node[key] = null;
                            this.context.transitionTo(new ConstructMappingState(node, key, indent));
                        } else {
                            throw new Error(`Mapping should not start at this position (Ln ${token.line}, Col ${token.column})`);
                        }
                    }
                }; break;
            case TokenKind.SequenceEntry:
                {
                    const { indent } = token;
                    if (indent > this.indent) {
                        throw new Error(`Sequence entry is not expected at this position (Ln ${token.line}, Col ${token.column})`);
                    } else {
                        const node = this.context.seqEntries[indent];
                        if (node) {
                            this.context.transitionTo(new SequenceExpectValueOrNewMapping(node, indent));
                        }
                    }
                }; break;
            case TokenKind.Comment: break;
        }
    }
}