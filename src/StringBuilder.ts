import { isWhiteSpace } from "./Helpers";

export abstract class StringBuilder {
    // Allow storing null elements and treat them as explicit 
    // line end marker instead of "\n" strings.
    // This allows plain "\n" characters to be preserved and 
    // not folded (from escape sequence in quoted string e.g.)
    protected spans: (string | null)[] = [];

    public get isEmpty() {
        return this.spans.length === 0;
    }

    public append(span: string): void {
        if (span === "") return;
        this.spans.push(span);
    }

    public appendLine(span: string = ""): void {
        this.append(span);
        this.spans.push(null);
    }

    public abstract toString(): string;
}

export class FoldedFlowScalarStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "";
        const { spans, spans: { length } } = this;
        for (let i = 0; i < length; i++) {
            const current = spans[i];
            if (current === null) {
                let breaks = 1;
                for (; i < length - 1; i++, breaks++) {
                    const next = spans[i + 1];
                    if (next !== null) {
                        break;
                    }
                }

                str += "\n".repeat(breaks - 1) || " ";
            }
            else {
                str += current;
            }
        }

        return str;
    }
}

/**
 * From the YAML spec:
 * 8.1.1.2. Block Chomping Indicator
 * Stripping is specified by the “-” chomping indicator. In this case, the final line break and any trailing 
 * empty lines are excluded from the scalar’s content.
 */
export class LiteralBlockScalarStripModeStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "", length = this.spans.length;
        const spans = this.spans;
        for (; length > 0 && spans[length - 1] === null; length--);
        for (let i = 0; i < length; i++) {
            const current = spans[i];
            str += (current === null ? "\n" : current);
        }

        return str;
    }
}

/**
 * From the YAML spec:
 * 8.1.1.2. Block Chomping Indicator
 * Clipping is the default behavior used if no explicit chomping indicator is specified. 
 * In this case, the final line break character is preserved in the scalar’s content. However, 
 * any trailing empty lines are excluded from the scalar’s content.
 */
export class LiteralBlockScalarClipModeStringBuilder extends LiteralBlockScalarStripModeStringBuilder {
    public override toString(): string {
        const str = super.toString();
        return str !== "" ? str + "\n" : str;
    }
}

/**
 * From the YAML spec:
 * 8.1.1.2. Block Chomping Indicator
 * Keeping is specified by the “+” chomping indicator. In this case, the final line break and any 
 * trailing empty lines are considered to be part of the scalar’s content. 
 * These additional lines are not subject to folding.
 */
export class LiteralBlockScalarKeepModeStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "";
        const { spans, spans: { length } } = this;
        for (let i = 0; i < length; i++) {
            const current = spans[i];
            str += (current === null ? "\n" : current);
        }

        return str;
    }
}

export class FoldedBlockScalarStripModeStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "";
        const { spans, spans: { length } } = this;

        for (let i = 0, preserve = true; i < length; i++) {
            const current = spans[i];
            if (current === null) {
                let breaks = 1;
                for (; i < length - 1; i++, breaks++) {
                    const next = spans[i + 1];
                    if (next !== null) {
                        preserve ||= isWhiteSpace(next.charCodeAt(0));
                        str += preserve ? "\n".repeat(breaks) : ("\n".repeat(breaks - 1) || " ");
                        break;
                    }
                }
            }
            else {
                str += current;
                // Set preserve flag if more indented line is detected, 
                // otherwise reset to allow folding at next iterations
                preserve = isWhiteSpace(current.charCodeAt(0));
            }
        }

        return str;
    }
}

export class FoldedBlockScalarKeepModeStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "";
        const { spans, spans: { length } } = this;
        main_loop: for (let i = 0, preserve = true; i < length; i++) {
            const current = spans[i];
            if (current === null) {
                let breaks = 1;
                for (; i < length - 1; i++, breaks++) {
                    const next = spans[i + 1];
                    if (next !== null) {
                        preserve ||= isWhiteSpace(next.charCodeAt(0));
                        str += preserve ? "\n".repeat(breaks) : ("\n".repeat(breaks - 1) || " ");
                        continue main_loop;
                    }
                }

                // From the spec:
                // Keeping is specified by the “+” chomping indicator. In this case, the final 
                // line break and any trailing empty lines are considered to be part of the 
                // scalar’s content. These additional lines are not subject to folding.
                str += "\n".repeat(breaks);
            }
            else {
                str += current;
                // Set preserve flag if more indented line is detected, 
                // otherwise reset to allow folding at next iterations
                preserve = isWhiteSpace(current.charCodeAt(0));
            }
        }

        return str;
    }
}

export class FoldedBlockScalarClipModeStringBuilder extends FoldedBlockScalarStripModeStringBuilder {
    public override toString(): string {
        const str = super.toString();
        return str !== "" ? str + "\n" : str;
    }
}