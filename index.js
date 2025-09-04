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

  /** @param {ParserState} parserState */
  transform(parserState) {
    if(isErrorState(parserState)) return parserState

    let cache = parserState.cacheMap.get(this)
    if(cache == null) {
      cache = new Map()
      parserState.cacheMap.set(this, cache)
    }
    /** @type {ParserResult<T> | undefined} */
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

    const nextParserState = this.transform(parserState)

    return /**@satisfies {ParserResult} */({
      status: nextParserState.status,
      index: nextParserState.index,
      error: nextParserState.error,
      result: nextParserState.result,
    })
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
    // TODO: handle partial cases
    // const remainingInput = parserState.input.value.slice(parserState.index)
    // if(!parserState.input.done && remainingInput.length < text.length && text.startsWith(remainingInput)) {
    //   return {
    //     ...parserState,
    //     index: parserState.index + remainingInput.length,
    //     status: ParserStateStatus.PARTIAL,
    //     result: remainingInput,
    //   }
    // }

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

/**
  * @template {Parser[]} T
  * @param {T} parsers
  */
function sequenceOf(...parsers) {
  return new Parser(parserState => {
    let result = /** @type {{[K in keyof T]: ParserType<T[K]>}} */(new Array(parsers.length))
    
    /** @type {ParserState} */
    let currentState = parserState
    for(let i = 0; i < parsers.length; i++) {
      currentState = /** @type {ParserState} */(parsers[i].transform(currentState))
      if(isErrorState(currentState)) {
        return currentState
      }
      result[i] = currentState.result
    }

    return {
      ...currentState,
      result,
    }
  })
}

// {
//   const parser = literal("Hello")
//   console.log(parser.parseString("Hell"))
//   console.log(parser.parseString("Hello, world!"))
//   console.log(parser.parseString("Hi, world!"))
// }

{
  const parser = sequenceOf(
    literal("Hello"),
    literal(", "),
    literal("world"),
    literal("!"),
  )
  console.log(parser.parseString("Hell"))
  console.log(parser.parseString("Hello"))
  console.log(parser.parseString("Hello, world!"))
  console.log(parser.parseString("Hi, world!"))
}
