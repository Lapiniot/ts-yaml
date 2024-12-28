import * as SB from "../StringBuilder";
import { BlockScalarState } from "./BlockScalarState";

export class FoldedBlockScalarState extends BlockScalarState {
    protected createKeepModeStringBuilder(): SB.StringBuilder {
        return new SB.FoldedBlockScalarKeepModeStringBuilder();
    }

    protected createStripModeStringBuilder(): SB.StringBuilder {
        return new SB.FoldedBlockScalarStripModeStringBuilder();
    }

    protected createClipModeStringBuilder(): SB.StringBuilder {
        return new SB.FoldedBlockScalarClipModeStringBuilder();
    }

    protected throwInvalidBlockScalar(line: number, column: number): never {
        this.throw("Invalid folded block scalar", line, column);
    }
}