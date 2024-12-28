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

abstract class FoldedStringBuilder extends StringBuilder {
    /**
     * From the YAML spec:
     * 6.5. Line Folding
     * Line folding allows long lines to be broken for readability, while retaining the semantics of the original long line.
     * If a line break is followed by an empty line, it is trimmed; the first line break is discarded
     * and the rest are retained as content.
     * Otherwise (the following line is not empty), the line break is converted to a single space (x20).
     */
    protected fold(lines: (string | null)[], length?: number) {
        let str = "";
        length ??= lines.length;

        main_loop: for (let i = 0, preserve = true; i < length; i++) {
            const current = lines[i];
            if (current === null) {
                let breaks = 1;
                for (; i < length - 1; i++, breaks++) {
                    const next = lines[i + 1];
                    if (next !== null) {
                        preserve ||= isWhiteSpace(next.charCodeAt(0));
                        str += preserve ? "\n".repeat(breaks) : ("\n".repeat(breaks - 1) || " ");
                        continue main_loop;
                    }
                }

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

export class YamlFoldingStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "";
        const lines = this.spans;
        for (let i = 0; i < lines.length; i++) {
            const current = lines[i];
            str += (current === null
                ? lines[i - 1] !== null
                    ? lines[i + 1] !== null ? " " : ""
                    : "\n"
                : current);
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
export class LiteralBlockStripModeStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "", len = this.spans.length;
        const lines = this.spans;
        for (; len > 0 && lines[len - 1] === null; len--);
        for (let i = 0; i < len; i++) {
            const current = lines[i];
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
export class LiteralBlockClipModeStringBuilder extends LiteralBlockStripModeStringBuilder {
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
export class LiteralBlockKeepModeStringBuilder extends StringBuilder {
    public override toString(): string {
        let str = "";
        const lines = this.spans, len = lines.length;
        for (let i = 0; i < len; i++) {
            const current = lines[i];
            str += (current === null ? "\n" : current);
        }

        return str;
    }
}

export class FoldedBlockStripModeStringBuilder extends FoldedStringBuilder {
    public override toString(): string {
        const lines = this.spans;
        let len = lines.length;
        for (; len > 0 && lines[len - 1] === null; len--);
        return this.fold(lines, len);
    }
}

export class FoldedBlockKeepModeStringBuilder extends FoldedStringBuilder {
    public override toString(): string {
        return this.fold(this.spans);
    }
}

export class FoldedBlockClipModeStringBuilder extends FoldedBlockStripModeStringBuilder {
    public override toString(): string {
        const str = super.toString();
        return str !== "" ? str + "\n" : str;
    }
}