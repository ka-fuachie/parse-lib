import { describe, expect, test, vi } from "vitest"
import {
  Parser,
  ParserStateStatus,
  ParserUnexpectedEndOfInputError,
  literal,
  anyChar,
  charFrom,
  endOfInput,
  sequenceOf,
  oneOf,
  zeroOrMore,
  oneOrMore,
  optional,
  followedBy,
  notFollowedBy,
  lazy,
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
  const helloCharactersParser = charFrom("H", "e", "l", "o")
  const letterParser = charFrom(["a", "z"], ["A", "Z"])

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

describe("oneOf", () => {
  const helloOrHiParser = oneOf(
    literal("Hello"),
    literal("Hi")
  )

  test("should parse first matching alternative", () => {
    const result = helloOrHiParser.parseString("Hello, world")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "Hello",
      index: 5,
      error: null,
    })
  })

  test("should parse next matching alternative", () => {
    const result = helloOrHiParser.parseString("Hi, world")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "Hi",
      index: 2,
      error: null,
    })
  })

  test("should fail when no alternatives match", () => {
    const result = helloOrHiParser.parseString("Hey, world")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["Hell", {
        status: ParserStateStatus.PARTIAL,
        result: "Hell",
        index: 4,
        error: null,
      }],
      ["", null],
      ["o, world!", {
        status: ParserStateStatus.COMPLETE,
        result: "Hello",
        index: 5,
        error: null,
      }],
    ])

    for(let result of helloOrHiParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("zeroOrMore", () => {
  const hahaParser = zeroOrMore(literal("Ha"))

  test("should parse many occurrences", () => {
    const result = hahaParser.parseString("HaHaHa!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: ["Ha", "Ha", "Ha"],
      index: 6,
      error: null,
    })
  })

  test("should parse zero occurrences", () => {
    const result = hahaParser.parseString("HoHoHo!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: [],
      index: 0,
      error: null,
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["Ha", {
        status: ParserStateStatus.PARTIAL,
        result: ["Ha"],
        index: 2,
        error: null,
      }],
      ["H", {
        status: ParserStateStatus.PARTIAL,
        result: ["Ha", "H"],
        index: 3,
        error: null,
      }],
      ["", null],
      ["aHa!", {
        status: ParserStateStatus.COMPLETE,
        result: ["Ha", "Ha", "Ha"],
        index: 6,
        error: null,
      }],
    ])

    for(let result of hahaParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("oneOrMore", () => {
  const hahaParser = oneOrMore(literal("Ha"))

  test("should parse at least one occurrence", () => {
    const result = hahaParser.parseString("Ha!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: ["Ha"],
      index: 2,
      error: null,
    })
  })

  test("should parse many occurrences", () => {
    const result = hahaParser.parseString("HaHaHa!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: ["Ha", "Ha", "Ha"],
      index: 6,
      error: null,
    })
  })

  test("should fail on zero occurrences", () => {
    const result = hahaParser.parseString("HoHoHo!")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["Ha", {
        status: ParserStateStatus.PARTIAL,
        result: ["Ha"],
        index: 2,
        error: null,
      }],
      ["H", {
        status: ParserStateStatus.PARTIAL,
        result: ["Ha", "H"],
        index: 3,
        error: null,
      }],
      ["", null],
      ["aHa!", {
        status: ParserStateStatus.COMPLETE,
        result: ["Ha", "Ha", "Ha"],
        index: 6,
        error: null,
      }],
    ])

    for(let result of hahaParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("optional", () => {
  const haParser = optional(literal("Ha"))

  test("should parse present optional element", () => {
    const result = haParser.parseString("HaHaHa!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "Ha",
      index: 2,
      error: null,
    })
  })

  test("should parse absent optional element", () => {
    const result = haParser.parseString("HoHoHo!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: null,
      index: 0,
      error: null,
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["Ha", {
        status: ParserStateStatus.COMPLETE,
        result: "Ha",
        index: 2,
        error: null,
      }],
      ["H", null],
      ["aHaHa!", null],
    ])

    for(let result of haParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("followedBy", () => {
  const helloVerifierParser = followedBy(literal("Hello"))

  test("should parse when followed by specified pattern", () => {
    const result = helloVerifierParser.parseString("Hello, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: "Hello",
      index: 0,
      error: null,
    })
  })

  test("should fail when not followed by specified pattern", () => {
    const result = helloVerifierParser.parseString("Hi, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["Hell", {
        status: ParserStateStatus.PARTIAL,
        result: "Hell",
        index: 0,
        error: null,
      }],
      ["", null],
      ["o, world!", {
        status: ParserStateStatus.COMPLETE,
        result: "Hello",
        index: 0,
        error: null,
      }]
    ])

    for(let result of helloVerifierParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("notFollowedBy", () => {
  const notHelloVerifierParser = notFollowedBy(literal("Hello"))

  test("should parse when not followed by specified pattern", () => {
    const result = notHelloVerifierParser.parseString("Hi, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: null,
      index: 0,
      error: null,
    })
  })

  test("should fail when followed by specified pattern", () => {
    const result = notHelloVerifierParser.parseString("Hello, world!")

    expect(result).toMatchObject({
      status: ParserStateStatus.ERROR,
      result: null,
      index: 0,
      error: expect.any(Error),
    })
  })

  test("should parse iterable input", () => {
    const { input, getExpectedState } = createTestSequence([
      ["", null],
      ["", null],
      ["H", {
        status: ParserStateStatus.PARTIAL,
        result: null,
        index: 0,
        error: null,
      }],
      ["", null],
      ["i, world!", {
        status: ParserStateStatus.COMPLETE,
        result: null,
        index: 0,
        error: null,
      }]
    ])

    for(let result of notHelloVerifierParser.parseIterable(input)) {
      expect(result).toMatchObject(getExpectedState())
    }
  })
})

describe("lazy", () => {
  const singleItemNumberArrayParserThunk = () => sequenceOf(
    literal("["),
    arrayValueParser,
    literal("]")
  )
  const singleItemNumberArrayParser = lazy(singleItemNumberArrayParserThunk)
  const arrayValueParser = oneOf(
    singleItemNumberArrayParser,
    charFrom(["0", "9"])
  )

  test("should lazily evaluate parser thunk", () => {
    const helloWorldParserThunk = vi.fn(() => sequenceOf(
      helloParser,
      literal(", "),
      literal("world")
    ))
    const helloWorldParser = lazy(helloWorldParserThunk)
    const helloParser = literal("Hello")

    expect(helloWorldParserThunk).not.toHaveBeenCalled()

    helloWorldParser.parseString("Hello, world")
    expect(helloWorldParserThunk).toHaveBeenCalled()
  })

  test("should call parser thunk once", () => {
    const helloWorldParserThunk = vi.fn(() => sequenceOf(
      helloParser,
      literal(", "),
      literal("world")
    ))
    const helloWorldParser = lazy(helloWorldParserThunk)
    const helloParser = literal("Hello")

    helloWorldParser.parseString("Hello, world")
    helloWorldParser.parseString("Hello, world")
    helloWorldParser.parseString("Hello, world")
    expect(helloWorldParserThunk).toHaveBeenCalledOnce()
  })

  test("should handle recursive parsers", () => {
    const simpleResult = singleItemNumberArrayParser.parseString("[5]")

    expect(simpleResult).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: ["[", "5", "]"],
      index: 3,
      error: null,
    })

    const nestedResult = singleItemNumberArrayParser.parseString("[[3]]")
    expect(nestedResult).toMatchObject({
      status: ParserStateStatus.COMPLETE,
      result: ["[", ["[", "3", "]"], "]"],
      index: 5,
      error: null,
    })
  })
})
