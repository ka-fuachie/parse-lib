import { describe, expect, test } from "vitest"
import {
  Parser,
  ParserStateStatus,
  ParserUnexpectedEndOfInputError,
  literal,
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

  test("should parse exact matching string", () => {
    const result = helloWorldParser.parseString("Hello, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "Hello, world!",
      index: 13,
      error: null,
    })
  })

  test("should fail on non-matching string", () => {
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
