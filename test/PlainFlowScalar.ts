import { test, suite } from "node:test";
import assert from "node:assert";
import Parser from "../src/Parser";

suite("Plain flow scalar parsing", {}, () => {
    test("Parse as null from empty line", () => {
        const actual = Parser.parse("");
        const expected = null;
        assert.equal(actual, expected);
    })

    test("Parse as null from empty line with whitespaces only", () => {
        const actual = Parser.parse("     \t    \t      ");
        const expected = null;
        assert.equal(actual, expected);
    })

    test("Parse as null from empty lines with line-breaks (LF style)", () => {
        const actual = Parser.parse("\n\n\n\n");
        const expected = null;
        assert.equal(actual, expected);
    })

    test("Parse as null from empty lines with line-breaks (CR style)", () => {
        const actual = Parser.parse("\r\r\r\r");
        const expected = null;
        assert.equal(actual, expected);
    })

    test("Parse as null from empty lines with line-breaks (CRLF style)", () => {
        const actual = Parser.parse("\r\n\r\n\r\n\r\n");
        const expected = null;
        assert.equal(actual, expected);
    })

    test("Parse as null from empty lines with line-breaks (mixed style)", () => {
        const actual = Parser.parse("\r\r\r\n\n\n");
        const expected = null;
        assert.equal(actual, expected);
    })

    test("Parse single line text", () => {
        const actual = Parser.parse("some text");
        const expected = "some text";
        assert.equal(actual, expected);
    })

    test("Parse single line text, trim leading and trailing spaces", () => {
        const actual = Parser.parse("   some text   ");
        const expected = "some text";
        assert.equal(actual, expected);
    })

    test("Parse single line text, trim leading and trailing spaces, including tabs", () => {
        const actual = Parser.parse("\t   some text\t   ");
        const expected = "some text";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, convert single line break to space", () => {
        const actual = Parser.parse(String.raw`line 1
line 2
line 3
line 4`);
        const expected = "line 1 line 2 line 3 line 4";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, trim leading and trailing whitespaces on every line", () => {
        const actual = Parser.parse(String.raw`
            line 1          
            line 2      
            line 3      
            line 4          
        `);
        const expected = "line 1 line 2 line 3 line 4";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, collapse first line break in raw, but preserve subsequent", () => {
        const actual = Parser.parse(String.raw`
            line 1

            line 2


            line 3
        `);
        const expected = "line 1\nline 2\n\nline 3";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, collapse all leading and trailing line breaks", () => {
        const actual = Parser.parse(String.raw`
            
            
            line 1
            line 2



        `);
        const expected = "line 1 line 2";
        assert.equal(actual, expected);
    })

    test("Parse multi-line text with folding, normalize line breaks to LF style", () => {
        const actual = Parser.parse("line 1\r\rline 2\r\n\r\nline 3\n\nline 4");
        const expected = "line 1\nline 2\nline 3\nline 4";
        assert.equal(actual, expected);
    })
})