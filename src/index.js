// TODO: handle error cases properly, proper error messages and structures
// TODO: validate parser params properly, eg. sequenceOf should have at least one parser
// TODO: properly handle recursive parsers(Fix left recursion)

const ParserStateStatus = /**@type{const}*/({
  COMPLETE: "complete",
  PARTIAL: "partial",
  ERROR: "error",
})

/** @typedef {typeof ParserStateStatus[keyof typeof ParserStateStatus]} ParserStateStatusType */

/**
  * @template [T = any]
  * @typedef {Object} SuccessParserState
  * @property {Object} input
  * @property {string} input.value
  * @property {boolean} input.done
  * @property {number} index
  * @property {Exclude<ParserStateStatusType, "error">} status
  * @property {T} result
  * @property {null} error
  * @property {Map<Parser, Map<number, ParserState>>} cacheMap
  */

/**
  * @typedef {Object} ErrorParserState
  * @property {Object} input
  * @property {string} input.value
  * @property {boolean} input.done
  * @property {number} index
  * @property {Extract<ParserStateStatusType, "error">} status
  * @property {null} result
  * @property {Error} error
  * @property {Map<Parser, Map<number, ParserState>>} cacheMap
  */

/**
  * @template [T = any]
  * @typedef {SuccessParserState<T> | ErrorParserState} ParserState
  */

/**
  * @template [T = any]
  * @typedef {Pick<ParserState<T>, "index" | "status" | "error" | "result">} ParserResult
  */

/**
  * @template T
  * @callback StateTransformFn
  * @param {SuccessParserState} parserState
  * @returns {ParserState<T>}
  */

/**
  * @param {ParserState} state
  * @returns {state is ErrorParserState}
  */
function isErrorState(state) {
  return state.status === ParserStateStatus.ERROR
}

class ParserUnexpectedEndOfInputError extends Error {
  name = "ParserEndOfInputError"
}

/** @template T */
class Parser {
  /** @type {StateTransformFn<T>} */
  #stateTransformFn

  /**
    * @param {StateTransformFn<T>} stateTransformFn
    */
  constructor(stateTransformFn) {
    this.#stateTransformFn = stateTransformFn
  }

  /**
    * @template S
    * @param {(result: T) => S} fn
    */
  map(fn) {
    return new Parser(parserState => {
      const newState = this.transform(parserState)
      if(newState.status === ParserStateStatus.ERROR) return newState

      return {
        ...newState,
        result: fn(newState.result)
      }
    })
  }

  /** @param {ParserState} parserState */
  transform(parserState) {
    if(isErrorState(parserState)) return parserState

    let cache = parserState.cacheMap.get(this)
    if(cache == null) {
      cache = new Map()
      parserState.cacheMap.set(this, cache)
    }
    /** @type {ParserState<T> | undefined} */
    let cachedParserState = cache.get(parserState.index)
    if(cachedParserState != null && (
      (cachedParserState.status === ParserStateStatus.COMPLETE) ||
      (cachedParserState.status === ParserStateStatus.PARTIAL && cachedParserState.input.value === parserState.input.value && cachedParserState.input.done === parserState.input.done) || 
      (cachedParserState.status === ParserStateStatus.ERROR && !(cachedParserState.error instanceof ParserUnexpectedEndOfInputError && !cachedParserState.input.done))
    )) {
      return {
        ...cachedParserState,
        input: parserState.input,
        cacheMap: parserState.cacheMap,
      }
    }

    const nextParserState = this.#stateTransformFn(parserState)
    cache.set(parserState.index, nextParserState)
    return nextParserState
  }

  /** @param {string} input */
  parseString(input) {
    /** @satisfies {ParserState} */
    const parserState = {
      input: { value: input, done: true },
      index: 0,
      status: ParserStateStatus.PARTIAL,
      result: null,
      error: null,
      cacheMap: new Map(),
    }

    const nextParserState = this.transform(parserState)
    return nextParserState
  }

  /** @param {Iterable<string>} input */
  *parseIterable(input) {
    /** @satisfies {ParserState} */
    const parserState = {
      input: { value: "", done: false },
      index: 0,
      status: ParserStateStatus.PARTIAL,
      result: null,
      error: null,
      cacheMap: new Map(),
    }

    /** @type {ParserState<T>} */
    let currentParserState = parserState
    let currentInputValue = ""

    for(let chunk of input) {
      currentInputValue += chunk
      const nextParserState = /**@type{ParserState<T>}*/(this.transform({
        ...currentParserState,
        input: {
          value: currentInputValue,
          done: false,
        },
        index: 0,
      }))

      // @ts-ignore
      if(nextParserState.status === ParserStateStatus.ERROR && nextParserState.error instanceof ParserUnexpectedEndOfInputError) continue
      if(currentParserState.input.value === nextParserState.input.value && currentParserState.index === nextParserState.index && currentParserState.status === nextParserState.status) continue

      currentParserState = nextParserState
      yield currentParserState

      if(currentParserState.status !== ParserStateStatus.PARTIAL) return
    }

    currentParserState = /**@type{ParserState<T>}*/(this.transform({
      ...currentParserState,
      input: {
        value: currentInputValue,
        done: true,
      },
      index: 0,
    }))

    yield currentParserState
  }

  /** @param {AsyncIterable<string>} input */
  async *parseAsyncIterable(input) {
    /** @satisfies {ParserState} */
    const parserState = {
      input: { value: "", done: false },
      index: 0,
      status: ParserStateStatus.PARTIAL,
      result: null,
      error: null,
      cacheMap: new Map(),
    }

    /** @type {ParserState<T>} */
    let currentParserState = parserState
    let currentInputValue = ""

    for await(let chunk of input) {
      currentInputValue += chunk
      const nextParserState = /**@type{ParserState<T>}*/(this.transform({
        ...currentParserState,
        input: {
          value: currentInputValue,
          done: false,
        },
        index: 0,
      }))

      // @ts-ignore
      if(nextParserState.status === ParserStateStatus.ERROR && nextParserState.error instanceof ParserUnexpectedEndOfInputError) continue
      if(currentParserState.input.value === nextParserState.input.value && currentParserState.index === nextParserState.index && currentParserState.status === nextParserState.status) continue

      currentParserState = nextParserState
      yield currentParserState

      if(currentParserState.status !== ParserStateStatus.PARTIAL) return
    }

    currentParserState = /**@type{ParserState<T>}*/(this.transform({
      ...currentParserState,
      input: {
        value: currentInputValue,
        done: true,
      },
      index: 0,
    }))

    yield currentParserState
  }
  }
}

/**
  * @template {Parser} T
  * @typedef {T extends Parser<infer U> ? U : never} ParserType
  */

/**
  * @param {string} text
  * @returns {Parser<string>}
  */
function literal(text) {
  return new Parser(parserState => {
    const remainingInput = parserState.input.value.slice(parserState.index)

    if(remainingInput.length === 0) {
      return {
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new ParserUnexpectedEndOfInputError(`Expected "${text}", but got unexpected end of input`)
      }
    }

    if(!parserState.input.done && remainingInput.length < text.length && text.startsWith(remainingInput)) {
      return {
        ...parserState,
        index: parserState.index + remainingInput.length,
        status: ParserStateStatus.PARTIAL,
        result: remainingInput,
      }
    }

    if(!parserState.input.value.startsWith(text, parserState.index)) {
      return {
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new Error(`Expected "${text}", but got "${parserState.input.value.slice(parserState.index, parserState.index + text.length)}"`),
      }
    }

    return {
      ...parserState,
      index: parserState.index + text.length,
      status: ParserStateStatus.COMPLETE,
      result: text,
    }
  })
}

/** @type {Parser<string>} */
const anyChar = new Parser(parserState => {
  if(parserState.index >= parserState.input.value.length) {
    return {
      ...parserState,
      status: ParserStateStatus.ERROR,
      error: new ParserUnexpectedEndOfInputError(`Expected any character, but got unexpected end of input`),
    }
  }

  return {
    ...parserState,
    status: ParserStateStatus.COMPLETE,
    index: parserState.index + 1,
    result: parserState.input.value[parserState.index],
  }
})

/** @param {(string | [string, string])[]} charSet */
function charFrom(...charSet) {
  return new Parser(parserState => {
    if(parserState.index >= parserState.input.value.length) {
      return {
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new ParserUnexpectedEndOfInputError(`Expected character from set, but got unexpected end of input`),
      }
    }

    for(let i = 0; i < charSet.length; i++) {
      const charOrRange = charSet[i]

      if(typeof charOrRange === "string" && parserState.input.value[parserState.index] === charOrRange) {
        return {
          ...parserState,
          status: ParserStateStatus.COMPLETE,
          index: parserState.index + 1,
          result: parserState.input.value[parserState.index],
        }
      }

      if(Array.isArray(charOrRange)) {
        const [start, end] = charOrRange.map(c => c.charCodeAt(0)).sort((a, b) => a - b)
        const charCode = parserState.input.value[parserState.index].charCodeAt(0)

        if(charCode >= start && charCode <= end) {
          return {
            ...parserState,
            status: ParserStateStatus.COMPLETE,
            index: parserState.index + 1,
            result: parserState.input.value[parserState.index],
          }
        }
      }
    }

    return {
      ...parserState,
      status: ParserStateStatus.ERROR,
      error: new Error(`Expected character from set, but got "${parserState.input.value[parserState.index]}"`),
    }
  })
}

/** @type {Parser<null>} */
const endOfInput = new Parser(parserState => {
  if(parserState.index < parserState.input.value.length) {
    return {
      ...parserState,
      status: ParserStateStatus.ERROR,
      error: new Error(`Expected end of input, but got "${parserState.input.value.slice(parserState.index)}"`),
    }
  }

  if(!parserState.input.done) {
    return {
      ...parserState,
      status: ParserStateStatus.ERROR,
      error: new ParserUnexpectedEndOfInputError(`Expected end of input, but got unexpected end of input`),
    }
  }

  return {
    ...parserState,
    status: ParserStateStatus.COMPLETE,
    result: null,
  }
})

/**
  * @template {Parser[]} T
  * @param {T} parsers
  */
function sequenceOf(...parsers) {
  return new Parser(parserState => {
    let result = /** @type {{[K in keyof T]: ParserType<T[K]>}} */(new Array(parsers.length))
    
    /** @type {ParserState} */
    let currentParserState = parserState
    for(let i = 0; i < parsers.length; i++) {
      const nextParserState = /** @type {ParserState} */(parsers[i].transform(currentParserState))
      if(isErrorState(nextParserState) && nextParserState.error instanceof ParserUnexpectedEndOfInputError && !nextParserState.input.done) {
        return {
          ...currentParserState,
          status: ParserStateStatus.PARTIAL,
          result,
        }
      }
      if(isErrorState(nextParserState)) return nextParserState

      result[i] = nextParserState.result
      currentParserState = nextParserState
    }

    return {
      ...currentParserState,
      result,
    }
  })
}

/**
  * @template {Parser[]} T
  * @param {T} parsers
  */
function oneOf(...parsers) {
  return new Parser(parserState => {
    let firstErrorState = null
    for(let i = 0; i < parsers.length; i++) {
      const nextParserState = /** @type {ParserState<ParserType<T[number]>>} */(parsers[i].transform(parserState))
      if(isErrorState(nextParserState) && nextParserState.error instanceof ParserUnexpectedEndOfInputError && !nextParserState.input.done) {
        return nextParserState
      }
      if(isErrorState(nextParserState)) {
        firstErrorState ??= nextParserState
        continue
      }

      return nextParserState
    }

    return firstErrorState
  })
}

/**
  * @template {Parser} T
  * @param {T} parser
  */
function zeroOrMore(parser) {
  return new Parser(parserState => {
    /** @type {ParserType<T>[]} */
    const result = []

    let currentParserState = parserState
    while(true) {
      const nextParserState = /** @type {ParserState} */(parser.transform(currentParserState))
      if(isErrorState(nextParserState) && nextParserState.error instanceof ParserUnexpectedEndOfInputError && !nextParserState.input.done) {
        return {
          ...currentParserState,
          status: ParserStateStatus.PARTIAL,
          result,
        }
      }
      if(isErrorState(nextParserState)) break

      result.push(nextParserState.result)
      currentParserState = nextParserState
    }

    return {
      ...currentParserState,
      status: result.length === 0 ? ParserStateStatus.COMPLETE : currentParserState.status,
      result,
    }
  })
}

/**
  * @template {Parser} T
  * @param {T} parser
  */
function oneOrMore(parser) {
  return new Parser(parserState => {
    /** @type {ParserType<T>[]} */
    const result = []

    let currentParserState = parserState
    while(true) {
      const nextParserState = /** @type {ParserState} */(parser.transform(currentParserState))
      if(isErrorState(nextParserState) && nextParserState.error instanceof ParserUnexpectedEndOfInputError && !nextParserState.input.done) {
        return {
          ...currentParserState,
          status: ParserStateStatus.PARTIAL,
          result,
        }
      }
      if(isErrorState(nextParserState)) break

      result.push(nextParserState.result)
      currentParserState = nextParserState
    }

    if(result.length === 0) {
      return /**@type {ParserState<ParserType<T>[]>}*/({
        ...currentParserState,
        status: ParserStateStatus.ERROR,
        error: new Error(`Expected at least one match, but got none`),
      })
    }

    return {
      ...currentParserState,
      result,
    }
  })
}

/**
  * @template {Parser} T
  * @param {T} parser
  */
function optional(parser) {
  return new Parser(parserState => {
    const nextParserState = /** @type {ParserState<ParserType<T>>} */(parser.transform(parserState))
    if(isErrorState(nextParserState) && nextParserState.error instanceof ParserUnexpectedEndOfInputError && !nextParserState.input.done) {
      return nextParserState
    }
    if(isErrorState(nextParserState)) {
      return /**@type {ParserState<null>}*/({
        ...parserState,
        status: ParserStateStatus.COMPLETE,
        result: null,
      })
    }

    return nextParserState
  })
}

/**
  * @template {Parser} T
  * @param {T} parser
  */
function followedBy(parser) {
  return new Parser(parserState => {
    const nextState = /** @type {ParserState<ParserType<T>>} */(parser.transform(parserState))
    if(isErrorState(nextState)) {
      return /**@type {ParserState<ParserType<T>>}*/({
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: nextState.error,
      })
    }

    return {
      ...parserState,
      status: nextState.status,
      result: nextState.result,
    }
  })
}

/**
  * @template {Parser} T
  * @param {T} parser
  */
function notFollowedBy(parser) {
  return new Parser(parserState => {
    const nextParserState = /** @type {ParserState} */(parser.transform(parserState))
    if(nextParserState.status === ParserStateStatus.COMPLETE) {
      return /**@type {ParserState<null>}*/({
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new Error(`Expected to not be followed by given parser, but it did match`),
      })
    }

    if(isErrorState(nextParserState) && nextParserState.error instanceof ParserUnexpectedEndOfInputError && !nextParserState.input.done) {
      return /**@type {ParserState<null>}*/({
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new ParserUnexpectedEndOfInputError(`Expected to not be followed by given parser, but got unexpected end of input`),
      })
    }

    if(nextParserState.status === ParserStateStatus.PARTIAL) {
      return /**@type {ParserState<null>}*/({
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new ParserUnexpectedEndOfInputError(`Expected to not be followed by given parser, but got partial match`),
      })
    }

    return {
      ...parserState,
      status: ParserStateStatus.COMPLETE,
      result: null,
    }
  })
}

/**
  * @template {Parser} T
  * @param {() => T} parserThunk
  */
function lazy(parserThunk) {
  let cachedParser = null
  return new Parser(parserState => {
    const parser = cachedParser ??= parserThunk()
    return /**@type{ParserState<ParserType<T>>}*/(parser.transform(parserState))
  })
}

export {
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
}
