import assert from "node:assert";
import { suite, test } from "node:test";
import Parser from "../src/Parser";

suite("Literal block scalar parsing", () => {

    test("Parse as empty string, given empty sequence with block type indicator only", () => {
        const actual = Parser.parse("|");
        const expected = "";
        assert.equal(actual, expected);
    });

    test("Parse as empty string, given empty sequence with block type indicator and whitespaces", () => {
        const actual = Parser.parse("|   \t   \t");
        const expected = "";
        assert.equal(actual, expected);
    });

    test("Parse as empty string, given empty lines only", () => {
        const actual = Parser.parse(String.raw`    |
         

         
`);
        const expected = "";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar, detect content indentation", () => {
        const actual = Parser.parse(String.raw`  |
      literal
        text`);
        const expected = "literal\n  text\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar, normalize line breaks to LF", () => {
        const actual = Parser.parse("|\r\nliteral\r\ntext\ncontent\r");
        const expected = "literal\ntext\ncontent\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar, allow optional one-line comment in the header after indicators", () => {
        const actual = Parser.parse(String.raw`| #some comment
literal
text`);
        const expected = "literal\ntext\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar, don't parse comment in the content (include text as-is)", () => {
        const actual = Parser.parse(String.raw`|
  literal # some comment
  text
  # another comment`);
        const expected = "literal # some comment\ntext\n# another comment\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar, with valid content indentation indicator 1 through 9", async ctx => {
        ctx.plan(9);
        for (let i = 1; i <= 9; i++) {
            await ctx.test(`Content indentation indicator: ${i}`, ctx => {
                ctx.plan(1);
                const actual = Parser.parse(String.raw`|${i}
${" ".repeat(i)}literal
${" ".repeat(i)}  text`);
                const expected = "literal\n  text\n";
                ctx.assert.equal(actual, expected);
            })
        }
    });

    test("Throw an error for invalid comment in the header after indicators without WS separation", () => {
        assert.throws(() =>
            Parser.parse(String.raw`|-1#some comment
 literal
 text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Throw an error for invalid content indentation indicator < 1", () => {
        assert.throws(() => Parser.parse(String.raw`|0
literal
text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Throw an error for invalid content indentation indicator > 9", () => {
        assert.throws(() => Parser.parse(String.raw`|10
literal
text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Throw an error for invalid header (duplicate indicators)", () => {
        assert.throws(() => Parser.parse(String.raw`|-+
    literal
    text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Throw an error for invalid header (spaces between indicators)", () => {
        assert.throws(() => Parser.parse(String.raw`| 1 -
    literal
    text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Throw an error for invalid header (non whitespaces after indicators)", () => {
        assert.throws(() => Parser.parse(String.raw`|1-1$%^&qwerty
    literal
    text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Parse literal block scalar with leading empty lines", () => {
        const actual = Parser.parse(String.raw`|


    literal
      text`);
        const expected = "\n\nliteral\n  text\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar with content (including WS only) and empty lines interleaved", () => {
        const actual = Parser.parse(String.raw`  |
      literal

          
        text

            

        `);
        const expected = "literal\n\n    \n  text\n\n      \n\n  \n";
        assert.equal(actual, expected);
    });


    test("Parse literal block scalar with trailing empty lines (implicit CLIP chomping)", () => {
        const actual = Parser.parse(String.raw`|
    literal
    text


`);
        const expected = "literal\ntext\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar with trailing empty lines (explicit STRIP chomping)", () => {
        const actual = Parser.parse(String.raw`|-
 literal
 text


`);
        const expected = "literal\ntext";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar with trailing empty lines (explicit KEEP chomping)", () => {
        const actual = Parser.parse(String.raw`|+
 literal
 text


`);
        const expected = "literal\ntext\n\n\n";
        assert.equal(actual, expected);
    });

    test("Parse literal block scalar with both chomping method and content indentation indicators", async ctx => {
        ctx.plan(4);
        await ctx.test("KEEP indicator, then content indentation (|+2 e.g.)", ctx => {
            const actual = Parser.parse(String.raw`|+2
   literal
   text


`);
            const expected = " literal\n text\n\n\n";
            ctx.assert.equal(actual, expected);
        });

        await ctx.test("Content indentation, then KEEP indicator (|2+ e.g.)", ctx => {
            const actual = Parser.parse(String.raw`|2+
   literal
   text


`);
            const expected = " literal\n text\n\n\n";
            ctx.assert.equal(actual, expected);
        });

        await ctx.test("STRIP indicator, then content indentation (|-2 e.g.)", ctx => {
            const actual = Parser.parse(String.raw`|-2
   literal
   text


`);
            const expected = " literal\n text";
            ctx.assert.equal(actual, expected);
        });

        await ctx.test("Content indentation, then STRIP indicator (|2- e.g.)", ctx => {
            const actual = Parser.parse(String.raw`|2-
   literal
   text


`);
            const expected = " literal\n text";
            ctx.assert.equal(actual, expected);
        });
    });

    test("Throw an error for any of the leading empty lines to contain more spaces than the first non-empty line", () => {
        assert.throws(() => Parser.parse(String.raw`|
       

    literal
      text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });

    test("Throw an error for any of the lines to contain less spaces than detected content indentation", () => {
        assert.throws(() => Parser.parse(String.raw`|
      literal
    text`), error => error instanceof Error && error.message === "Invalid literal block scalar at (Ln 1, Col 1).");
    });
})