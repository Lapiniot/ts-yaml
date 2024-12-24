import { spec } from "node:test/reporters";
import { run } from "node:test";
import process from "node:process";

run({
    files: [
        "test/PlainFlowScalar.ts",
        "test/DoubleQuotedFlowScalar.ts",
        "test/SingleQuotedFlowScalar.ts",
        "test/Document.ts"
    ]
})
    .compose(spec)
    .pipe(process.stdout);