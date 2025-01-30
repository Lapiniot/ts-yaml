import assert from "node:assert";
import { suite, test } from "node:test";
import Parser from "../src/Parser";

suite("Sequence parsing", () => {
    test("Parse single sequence indicator character as array with null entry", () => {
        const actual = Parser.parse("-");
        const expected = [null];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse single sequence indicator followed by whitespaces as array with null entry", () => {
        const actual = Parser.parse("- \t \t");
        const expected = [null];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse single sequence indicator followed by line breaks as array with null entry", () => {
        const actual = Parser.parse("-\r\n\n\n");
        const expected = [null];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse sequence indicator followed by non-whitespaces as string", () => {
        const actual = Parser.parse("-123");
        const expected = "-123";
        assert.strictEqual(actual, expected);
    });

    test("Parse multiple lines starting with sequence indicator as array", () => {
        const actual = Parser.parse(String.raw`- 123
- "some double-quoted string"
- 'some single-quoted string'
- some plain string`);
        const expected = ["123", "some double-quoted string", "some single-quoted string", "some plain string"];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse equally indented multiple lines starting with sequence indicator as array", () => {
        const actual = Parser.parse(String.raw`
        - 123
        - "some double-quoted string"
        - 'some single-quoted string'
        -
            some plain string`);
        const expected = ["123", "some double-quoted string", "some single-quoted string", "some plain string"];
        assert.deepStrictEqual(actual, expected);
    });

    test("Throws 'Unexpected state (TokenKind.Scalar)' when less idented entry happens", () => {
        assert.throws(() => {
            Parser.parse(String.raw`
            - 123
        - "some double-quoted string"
            - 'some single-quoted string'
            - some plain string`);
        }, e => e instanceof Error && e.message === "Unexpected state (TokenKind.Scalar)");
    });

    test("Throws 'Unexpected state (TokenKind.Scalar)' when less idented scalar happens", () => {
        assert.throws(() => {
            Parser.parse(String.raw`
            -
        123`);
        }, e => e instanceof Error && e.message === "Unexpected state (TokenKind.Scalar)");
    });

    test("Throws 'Unexpected state (TokenKind.Scalar)' when equaly idented scalar happens", () => {
        assert.throws(() => {
            Parser.parse(String.raw`
            -
            123`);
        }, e => e instanceof Error && e.message === "Unexpected state (TokenKind.Scalar)");
    });

    test("Parse leading indicator-only line + multiple lines starting with sequence indicator as array", () => {
        const actual = Parser.parse(String.raw`
        -
        - 123
        - "some double-quoted string"
        - 'some single-quoted string'
        - some plain string`);
        const expected = [null, "123", "some double-quoted string", "some single-quoted string", "some plain string"];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse multiple lines starting with sequence indicator + trailing indicator-only line as array", () => {
        const actual = Parser.parse(String.raw`
        - 123
        - "some double-quoted string"
        - 'some single-quoted string'
        - some plain string
        -`);
        const expected = ["123", "some double-quoted string", "some single-quoted string", "some plain string", null];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse multiple lines starting with sequence indicator + trailing indicator (followed by whitespaces) line as array", () => {
        const actual = Parser.parse(String.raw`
        - 123
        - "some double-quoted string"
        - 'some single-quoted string'
        - some plain string
        - ${"\t"} ${"\t"}`);
        const expected = ["123", "some double-quoted string", "some single-quoted string", "some plain string", null];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse multiple lines starting with sequence indicator + trailing indicator (followed by line-breaks) line as array", () => {
        const actual = Parser.parse(String.raw`
        - 123
        - "some double-quoted string"
        - 'some single-quoted string'
        - some plain string
        -

        `);
        const expected = ["123", "some double-quoted string", "some single-quoted string", "some plain string", null];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse empty indicator lines followed by more indented lines with indicators as nested arrays", () => {
        const actual = Parser.parse(String.raw`
        -
            -
        -
            - "some double-quoted string"
            - 'some single-quoted string'
            - some plain string
        -
            -
                - 1
                - 2
                - 3
            - 1
        -
            -
        `);
        const expected = [[null], ["some double-quoted string", "some single-quoted string", "some plain string"], [["1", "2", "3"], "1"], [null]];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse more indented lines starting with sequence indicator as plain string parts", () => {
        const actual = Parser.parse(String.raw`
            - 0
                - 1
                - 2
                - 3`);
        const expected = ["0 - 1 - 2 - 3"];
        assert.deepStrictEqual(actual, expected);
    });

    test("Parse nested map (on same line) inside sequence entry", () => {
        const actual = Parser.parse(String.raw`
            - prop1: value1`);
        const expected = [{ "prop1": "value1" }];
        assert.deepStrictEqual(actual, expected);
    });
})