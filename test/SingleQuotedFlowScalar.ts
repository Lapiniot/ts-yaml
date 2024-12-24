import { test, suite } from "node:test";
import assert from "node:assert/strict";
import Parser from "../src/Parser";

suite("Single quoted flow scalar parsing", {}, () => {
    test("Parse as empty string from empty sequence", () => {
        const actual = Parser.parse(String.raw`''`);
        const expected = "";
        assert.equal(actual, expected);
    })

    test("Parse single line text", () => {
        const actual = Parser.parse(String.raw`'some text'`);
        const expected = "some text";
        assert.equal(actual, expected);
    })

    test("Parse single line text, preserve leading and trailing spaces", () => {
        const actual = Parser.parse(String.raw`'   some text   '`);
        const expected = "   some text   ";
        assert.equal(actual, expected);
    })

    test("Parse single line text, preserve leading and trailing spaces, including tabs", () => {
        const actual = Parser.parse("'\t   some text\t   '");
        const expected = "\t   some text\t   ";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, convert single line break to space (including leading and trailing)", () => {
        const actual = Parser.parse(String.raw`'
line 1
line 2
line 3
line 4
'`);
        const expected = " line 1 line 2 line 3 line 4 ";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, trim leading but preserve trailing whitespaces on every line", () => {
        const actual = Parser.parse(String.raw`'line 1
    line 2      
        line 3          
            line 4'`);
        const expected = "line 1 line 2       line 3           line 4";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, collapse first line break in raw, but preserve subsequent", () => {
        const actual = Parser.parse(String.raw`'

line 1

line 2


line 3



line 4

'`);
        const expected = "\nline 1\nline 2\n\nline 3\n\n\nline 4\n";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, preserve leading whitespaces for the first line", () => {
        const actual = Parser.parse(String.raw`'      
line 1
line 2
line 3
line 4
    '`);
        const expected = "       line 1 line 2 line 3 line 4 ";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, normalize line breaks to LF style", () => {
        const actual = Parser.parse("'line 1\r\rline 2\r\n\r\nline 3\n\nline 4'");
        const expected = "line 1\nline 2\nline 3\nline 4";
        assert.equal(actual, expected);
    })

    test("DO NOT parse escape sequences, preserve as-is", () => {
        const actual = Parser.parse(String.raw`'\0\a\b\t\v\f\e\"\/\\\N\_\L\P\n\r\x00\x61\xaa\x0a\u0000\u2190\u00aa\u000a\U00010437\U00002192'`);
        const expected = String.raw`\0\a\b\t\v\f\e\"\/\\\N\_\L\P\n\r\x00\x61\xaa\x0a\u0000\u2190\u00aa\u000a\U00010437\U00002192`;
        assert.equal(actual, expected);
    })

    test("Parse pair of single quotes as escaped single quote (the only form of escaping allowed)", () => {
        const actual = Parser.parse("'Some''text'");
        const expected = "Some'text";
        assert.equal(actual, expected);
    })

    test("Throw error on missing closing single quote", () => {
        assert.throws(() => Parser.parse("'Some text"),
            error => error instanceof Error &&
                error.message === "Unexpected end of character sequence within single-quoted scalar at (Ln 1, Col 1).")
    })
})