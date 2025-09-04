const ParserStateStatus = /**@type{const}*/({
  COMPLETE: "complete",
  PARTIAL: "partial",
  ERROR: "error",
})

/** @typedef {typeof ParserStateStatus[keyof typeof ParserStateStatus]} ParserStateStatusType */

/**
  * @typedef {Object} SuccessParserState
  * @property {Object} input
  * @property {string} input.value
  * @property {boolean} input.done
  * @property {number} index
  * @property {Exclude<ParserStateStatusType, "error">} status
  * @property {any} result
  * @property {null} error
  * @property {Map<Parser, Map<number, ParserResult>>} cacheMap
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
  * @property {Map<Parser, Map<number, ParserResult>>} cacheMap
  */

/**
  * @typedef {SuccessParserState | ErrorParserState} ParserState
  */

/**
  * @typedef {Pick<ParserState, "index" | "status" | "error" | "result">} ParserResult
  */

/**
  * @callback StateTransformFn
  * @param {SuccessParserState} parserState
  * @returns {ParserState}
  */

/**
  * @param {ParserState} state
  * @returns {state is ErrorParserState}
  */
function isErrorState(state) {
  return state.status === ParserStateStatus.ERROR
}

class Parser {
  /** @type {StateTransformFn} */
  #stateTransformFn

  /**
    * @param {StateTransformFn} stateTransformFn
    */
  constructor(stateTransformFn) {
    this.#stateTransformFn = stateTransformFn
  }

  /** @param {ParserState} parserState */
  transform(parserState) {
    if(isErrorState(parserState)) return parserState

    let cache = parserState.cacheMap.get(this)
    if(cache == null) {
      cache = new Map()
      parserState.cacheMap.set(this, cache)
    }
    const cachedResult = cache.get(parserState.index)
    if(cachedResult != null) {
      return {
        ...parserState,
        ...cachedResult,
      }
    }

    const nextState = this.#stateTransformFn(parserState)
    cache.set(parserState.index, {
      index: nextState.index,
      status: nextState.status,
      error: nextState.error,
      result: nextState.result,
    })
    return nextState
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

    return this.transform(parserState)
  }
}

/** @param {string} s */
function literal(s) {
  return new Parser(parserState => {
    const remainingInput = parserState.input.value.slice(parserState.index)
    if(!parserState.input.done && remainingInput.length < s.length && s.startsWith(remainingInput)) {
      return {
        ...parserState,
        index: parserState.index + remainingInput.length,
        status: ParserStateStatus.PARTIAL,
        result: s,
      }
    }

    if(!parserState.input.value.startsWith(s, parserState.index)) {
      return {
        ...parserState,
        status: ParserStateStatus.ERROR,
        error: new Error(`Expected "${s}", but got "${parserState.input.value.slice(parserState.index, parserState.index + s.length)}"`),
      }
    }

    return {
      ...parserState,
      index: parserState.index + s.length,
      status: ParserStateStatus.COMPLETE,
      result: s,
    }
  })
}

const parser = literal("Hello")
console.log(parser.parseString("Hell"))
console.log(parser.parseString("Hello, world!"))
console.log(parser.parseString("Hi, world!"))
