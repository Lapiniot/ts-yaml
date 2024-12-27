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

/**
 * From the YAML spec:
 * 6.5. Line Folding
 * Line folding allows long lines to be broken for readability, while retaining the semantics of the original long line.
 * If a line break is followed by an empty line, it is trimmed; the first line break is discarded
 * and the rest are retained as content.
 * Otherwise (the following line is not empty), the line break is converted to a single space (x20).
 */
export class YamlFoldingStringBuilder extends StringBuilder {
    public override toString(): string {
        return this.spans.reduce((prev, current, index, arr) => prev +
            (current === null
                ? arr[index - 1] !== null
                    ? arr[index + 1] !== null
                        ? " "
                        : ""
                    : "\n"
                : current), "") as string;
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
        for (; len > 0 && this.spans[len - 1] === null; len--);
        for (let i = 0; i < len; i++) {
            const current = this.spans[i];
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
        for (let i = 0; i < this.spans.length; i++) {
            const current = this.spans[i];
            str += (current === null ? "\n" : current);
        }

        return str;
    }
}