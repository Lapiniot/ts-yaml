import * as SB from "../StringBuilder";
import { BlockScalarState } from "./BlockScalarState";

export class LiteralBlockScalarState extends BlockScalarState {
    protected override createKeepModeStringBuilder() {
        return new SB.LiteralBlockScalarKeepModeStringBuilder();
    }

    protected override createStripModeStringBuilder() {
        return new SB.LiteralBlockScalarStripModeStringBuilder();
    }

    protected override createClipModeStringBuilder() {
        return new SB.LiteralBlockScalarClipModeStringBuilder();
    }

    protected override throwInvalidBlockScalar(line: number, column: number): never {
        this.throw("Invalid literal block scalar", line, column);
    }
}