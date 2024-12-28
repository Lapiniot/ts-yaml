import * as SB from "../StringBuilder";
import { BlockScalarState } from "./BlockScalarState";

export class FoldedBlockScalarState extends BlockScalarState {
    protected createKeepModeStringBuilder(): SB.StringBuilder {
        return new SB.FoldedBlockKeepModeStringBuilder();
    }

    protected createStripModeStringBuilder(): SB.StringBuilder {
        return new SB.FoldedBlockStripModeStringBuilder();
    }

    protected createClipModeStringBuilder(): SB.StringBuilder {
        return new SB.FoldedBlockClipModeStringBuilder();
    }

    protected throwInvalidBlockScalar(line: number, column: number): never {
        this.throw("Invalid folded block scalar", line, column);
    }
}