import { test, suite } from "node:test";
import assert from "node:assert";
import Parser from "../src/Parser";

suite("Double quoted flow scalar parsing", {}, () => {
    test("Parse as empty string from empty sequence", () => {
        const actual = Parser.parse(String.raw`""`);
        const expected = "";
        assert.equal(actual, expected);
    })

    test("Parse single line text", () => {
        const actual = Parser.parse(String.raw`"some text"`);
        const expected = "some text";
        assert.equal(actual, expected);
    })

    test("Parse single line text, preserve leading and trailing spaces", () => {
        const actual = Parser.parse(String.raw`"   some text   "`);
        const expected = "   some text   ";
        assert.equal(actual, expected);
    })

    test("Parse single line text, preserve leading and trailing spaces, including tabs", () => {
        const actual = Parser.parse(String.raw`"\t   some text\t   "`);
        const expected = "\t   some text\t   ";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, convert single line break to space (including leading and trailing)", () => {
        const actual = Parser.parse(String.raw`"
line 1
line 2
line 3
line 4
"`);
        const expected = " line 1 line 2 line 3 line 4 ";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, trim leading but preserve trailing whitespaces on every line", () => {
        const actual = Parser.parse(String.raw`"line 1
    line 2      
        line 3          
            line 4"`);
        const expected = "line 1 line 2       line 3           line 4";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, collapse first line break in raw, but preserve subsequent", () => {
        const actual = Parser.parse(String.raw`"

line 1

line 2


line 3



line 4

"`);
        const expected = "\nline 1\nline 2\n\nline 3\n\n\nline 4\n";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, preserve leading whitespaces for the first line", () => {
        const actual = Parser.parse(String.raw`"      
line 1
line 2
line 3
line 4
    "`);
        const expected = "       line 1 line 2 line 3 line 4 ";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, normalize line breaks to LF style", () => {
        const actual = Parser.parse("\"line 1\r\rline 2\r\n\r\nline 3\n\nline 4\"");
        const expected = "line 1\nline 2\nline 3\nline 4";
        assert.equal(actual, expected);
    })

    test("Parse known escape sequences with backslash and single char", () => {
        const actual = Parser.parse(String.raw`"\0\a\b\t\v\f\e\"\/\\\N\_\L\P\n\r"`);
        const expected = "\x00\x07\b\t\v\f\x1B\"/\\\x85\xA0\u2028\u2029\n\r";
        assert.equal(actual, expected);
    })

    test("Parse 8bit Unicode escape sequences", () => {
        const actual = Parser.parse(String.raw`"\x00\x61\xaa\x0a"`);
        const expected = "\x00aª\n";
        assert.equal(actual, expected);
    })

    test("Parse 16bit Unicode escape sequences", () => {
        const actual = Parser.parse(String.raw`"\u0000\u2190\u00aa\u000a"`);
        const expected = "\x00←ª\n";
        assert.equal(actual, expected);
    })

    test("Parse 32bit Unicode escape sequences", () => {
        const actual = Parser.parse(String.raw`"\U00010437\U00002192"`);
        const expected = "𐐷→";
        assert.equal(actual, expected);
    })

    test("Throw error on missing closing double quote", () => {
        assert.throws(() => Parser.parse("\"Some text"),
            error => error instanceof Error &&
                error.message === "Unexpected end of character sequence within double-quoted scalar at (Ln 1, Col 1).")
    })
})