import { describe, expect, test } from "vitest"
import {
  Parser,
  ParserStateStatus,
  ParserUnexpectedEndOfInputError,
  literal,
  anyChar,
  charFrom,
  endOfInput,
  sequenceOf,
} from "./index.js"

/** @param {Array<[string, Partial<import("./index.js").ParserState>|null]>} entries */
function createTestSequence(entries) {
  let currentExpectedState = null
  
  function* inputGenerator() {
    for (let i = 0; i < entries.length; i++) {
      const [chunk, expectedState] = entries[i]
      currentExpectedState = expectedState ?? currentExpectedState
      yield chunk
    }
  }
  
  function getCurrentExpectedState() {
    return currentExpectedState
  }
  
  return {
    input: inputGenerator(),
    getExpectedState: getCurrentExpectedState,
  }
}

describe("Parser", () => {
})

describe("literal", () => {
  const helloWorldParser = literal("Hello, world!")

  test("should parse exact matching input", () => {
    const result = helloWorldParser.parseString("Hello, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "Hello, world!",
      index: 13,
      error: null,
    })
  })

  test("should fail on non-matching input", () => {
    const result = helloWorldParser.parseString("Hi, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should handle unexpected end of input", () => {
    const result = helloWorldParser.parseString("")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(ParserUnexpectedEndOfInputError),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["Hello", {
        status: ParserStateStatus.PARTIAL,
        result: "Hello",
        index: 5,
        error: null,
      }],
      ["", null],
      [", ", {
        status: ParserStateStatus.PARTIAL,
        result: "Hello, ",
        index: 7,
        error: null,
      }],
      ["", null],
      ["world!", {
        status: ParserStateStatus.COMPLETE,
        result: "Hello, world!",
        index: 13,
        error: null,
      }],
    ])

    for(let result of helloWorldParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("anyChar", () => {
  test("should parse any single character", () => {
    const result = anyChar.parseString("H")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "H",
      index: 1,
      error: null,
    })
  })

  test("should fail on empty input", () => {
    const result = anyChar.parseString("")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(ParserUnexpectedEndOfInputError),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["H", {
        status: ParserStateStatus.COMPLETE,
        result: "H",
        index: 1,
        error: null,
      }],
      ["e", null],
      ["l", null],
      ["l", null],
      ["o", null],
    ])

    for(let result of anyChar.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("charFrom", () => {
  const helloCharactersParser = charFrom(["H", "e", "l", "o"])
  const letterParser = charFrom([["a", "z"], ["A", "Z"]])

  test("should parse character from character set", () => {
    const result1 = helloCharactersParser.parseString("H")
    expect(result1).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "H",
      index: 1,
      error: null,
    })

    const result2 = helloCharactersParser.parseString("e")
    expect(result2).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "e",
      index: 1,
      error: null,
    })
  })

  test("should parse character from range", () => {
    const result1 = letterParser.parseString("H")
    expect(result1).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "H",
      index: 1,
      error: null,
    })

    const result2 = letterParser.parseString("a")
    expect(result2).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "a",
      index: 1,
      error: null,
    })
  })

  test("should fail on character not in set", () => {
    const result = helloCharactersParser.parseString("A")
    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should fail on character not in range", () => {
    const result = letterParser.parseString("1")
    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should fail on empty input", () => {
    const result = helloCharactersParser.parseString("")
    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(ParserUnexpectedEndOfInputError),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["H", {
        status: ParserStateStatus.COMPLETE,
        result: "H",
        index: 1,
        error: null,
      }],
      ["e", null],
      ["l", null],
      ["l", null],
      ["o", null],
    ])

    for(let result of helloCharactersParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
 })

describe("endOfInput", () => {
  test("should succeed on empty string", () => {
    const result = endOfInput.parseString("")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: null,
      index: 0,
      error: null,
    })
  })

  test("should fail on non-empty string", () => {
    const result = endOfInput.parseString("H")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
    expect(result.error.message).toBe('Expected end of input, but got "H"')
  })

  test("should parse iterable input with empty sequence", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["", {
        status: ParserStateStatus.COMPLETE,
        result: null,
        index: 0,
        error: null,
      }],
    ])

    for(let result of endOfInput.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })

  test("should fail on iterable input with content", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["H", {
        status: ParserStateStatus.ERROR,
        result: null,
        index: 0,
        error: expect.any(Error),
      }],
      ["e", null],
      ["l", null],
      ["l", null],
      ["o", null],
    ])

    for(let result of endOfInput.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("sequenceOf", () => {
  const helloWorldParser = sequenceOf(
    literal("Hello"),
    literal(", "),
    literal("world"),
    literal("!")
  )

  test("should parse sequence of literals", () => {
    const result = helloWorldParser.parseString("Hello, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: ["Hello", ", ", "world", "!"],
      index: 13,
      error: null,
    })
  })

  test("should fail on partial match", () => {
    const result = helloWorldParser.parseString("Hello, world")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      index: 12,
      error: expect.any(ParserUnexpectedEndOfInputError),
    })
  })

  test("should fail on no match", () => {
    const parser = sequenceOf(
      literal("Hello"),
      literal(", "),
      literal("world"),
      literal("!")
    )
    const result = parser.parseString("Hi, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["Hello", {
        status: ParserStateStatus.PARTIAL,
        result: ["Hello", undefined, undefined, undefined],
        index: 5,
        error: null,
      }],
      ["", null],
      [", world!", {
        status: ParserStateStatus.COMPLETE,
        result: ["Hello", ", ", "world", "!"],
        index: 13,
        error: null,
      }],
    ])

    for(let result of helloWorldParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})