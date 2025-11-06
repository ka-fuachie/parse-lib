# Parse-lib
Parse-lib is a javascript parser combinator library designed for streaming data inputs. It is build on packrat parsing techniques to ensure parsing with linear time complexity. The library provides a set of utility parsers and combinators to build complex parsers from simple ones, allowing for easy construction of parsers for various data formats.

## API

### Parser

Instance of parser returned by all parser methods

> [!CAUTION]
> Parsers should not be created directly as instances of this class, the api is subject to change

#### Instance methods

##### `Parser.map()`
Returns a new parser that transforms the parse result using the passed function param. Useful for applying structure to parse results

```js
const digitParser = charFrom(["0", "9"]).map(d => ({
    type: "digit",
    value: d
}))

console.log(digitParser.parseString("2b"))
// {
//     status: "complete",
//     index: 1,
//     result: {
//         type: "digit",
//         value: 2,
//     },
//     error: null
// }
```

##### `Parser.transform()`
Takes a parser state and returns a transformed version using the parser's internal state transform function. Mainly used in conjuction with the Parser constructor to create custom parsers


##### `Parser.parseString()`
Takes a string input and returns result of parsing the input using the parser

```js
const helloParser = literal("Hello")
console.log(helloParser.parseString("Hello world!"))
// {
//     status: "complete",
//     index: 5,
//     result: "hello",
//     error: null
// }
```

##### `Parser.parseIterable()`
Takes an iterable input and returns and iterable of the result of parsing the input using the parser. It yields intermediate results till the parser reaches a completed state

```js
function* getInput() {
    yield "Hello"
    yield " World!"
}

const helloWorldParser = sequenceOf([
    literal("Hello"),
    literal(" "),
    literal("World!")
])

for (const result of helloWorldParser.parseIterable(getInput())) {
    console.log(result)
}
// {
//     status: "partial",
//     index: 5,
//     result: ["Hello", undefined, undefined],
//     error: null
// }
// {
//     status: "complete",
//     index: 13,
//     result: ["Hello", " ", "World!"],
//     error: null
// }
```

### ParserStateStatus
Enum of a parser state status

- `ParserStateStatus.COMPLETE` - Parser has successfully completed parsing
- `ParserStateStatus.PARTIAL` - Parser needs more input to complete parsing
- `ParserStateStatus.ERROR` - Parser has encountered an error while parsing

### ParserUnexpectedEndOfInputError
An error indicating that the parser has reached the end of input unexpectedly while parsing. During streaming, this error indicates that the parser needs more input to continue parsing

### literal
Takes a string literal and returns a parser that matches the exact string

```js
literal("Hello").parseString("Hello World!")
// {
//     status: "complete",
//     index: 5,
//     result: "Hello",
//     error: null
// }
```

### anyChar
Matches any single character from the input

```js
anyChar().parseString("abc")
// {
//     status: "complete",
//     index: 1,
//     result: "a",
//     error: null
// }
```

### charFrom
Takes a list of characters or character ranges and returns a parser that matches any single character from the list or range

```js
charFrom("a", "b", "c").parseString("cat")
// {
//     status: "complete",
//     index: 1,
//     result: "c",
//     error: null
// }

charFrom(["0", "9"]).parseString("5abc") // Ranges are passed as 2-element tuples
// {
//     status: "complete",
//     index: 1,
//     result: "5",
//     error: null
// }
```

### endOfInput
Matches the end of input

```js
endOfInput().parseString("")
// {
//     status: "complete",
//     index: 0,
//     result: null,
//     error: null
// }

endOfInput().parseString("Hello")
// {
//     status: "error",
//     index: 0,
//     result: null,
//     error: Error('Expected end of input, but got "Hello"')
// }
```

### sequenceOf
Takes a list of parsers and returns a parser that matches the sequence of parsers in order. The result is an array of the results of each parser

```js
const helloWorldParser = sequenceOf([
    literal("Hello"),
    literal(" "),
    literal("World!")
])

console.log(helloWorldParser.parseString("Hello World!"))
// {
//     status: "complete",
//     index: 13,
//     result: ["Hello", " ", "World!"],
//     error: null
// }
```

### oneOf
Takes a list of parsers and returns the result of the first successful parser. If all parsers fail, returns the error of the first parser

```js
const digitOrLetterParser = oneOf([
    charFrom(["0", "9"]),
    charFrom(["a", "z"], ["A", "Z"])
])

console.log(digitOrLetterParser.parseString("5abc"))
// {
//     status: "complete",
//     index: 1,
//     result: "5",
//     error: null
// }
console.log(digitOrLetterParser.parseString("abc"))
// {
//     status: "complete",
//     index: 1,
//     result: "a",
//     error: null
// }
```

### zeroOrMore
Takes a parser and returns a parser that matches zero or more occurrences of the parser. The result is an array of the results of each occurrence

```js
const digitParser = charFrom(["0", "9"])
const digitsParser = zeroOrMore(digitParser)
console.log(digitsParser.parseString("123abc"))
// {
//     status: "complete",
//     index: 3,
//     result: ["1", "2", "3"],
//     error: null
// }
console.log(digitsParser.parseString("abc"))
// {
//     status: "complete",
//     index: 0,
//     result: [],
//     error: null
// }
```

### oneOrMore
Takes a parser and returns a parser that matches one or more occurrences of the parser. The result is an array of the results of each occurrence. It results in an error if it matches no occurence of the parser

```js
const digitParser = charFrom(["0", "9"])
const digitsParser = oneOrMore(digitParser)
console.log(digitsParser.parseString("123abc"))
// {
//     status: "complete",
//     index: 3,
//     result: ["1", "2", "3"],
//     error: null
// }
console.log(digitsParser.parseString("abc"))
// {
//     status: "error",
//     index: 0,
//     result: null,
//     error: Error('Expected character from set, but got "abc"')
// }
```

### optional
Takes a parser and returns a parser that matches zero or one occurrence of the parser. The result is the result of the parser or null if it matches no occurrence

```js
const digitParser = charFrom(["0", "9"])
const optionalDigitParser = optional(digitParser)
console.log(optionalDigitParser.parseString("5abc"))
// {
//     status: "complete",
//     index: 1,
//     result: "5",
//     error: null
// }
console.log(optionalDigitParser.parseString("abc"))
// {
//     status: "complete",
//     index: 0,
//     result: null,
//     error: null
// }
```

### followedBy
Takes a parser and returns a parser that matches the parser but does not consume any input.

```js
const digitParser = charFrom(["0", "9"])
const followedByDigitParser = followedBy(digitParser)
console.log(followedByDigitParser.parseString("5abc"))
// {
//     status: "complete",
//     index: 0,
//     result: "5",
//     error: null
// }
```

### notFollowedBy
Takes a parser and returns a parser that matches if the parser does not match, without consuming any input.

```js
const digitParser = charFrom(["0", "9"])
const notFollowedByDigitParser = notFollowedBy(digitParser)
console.log(notFollowedByDigitParser.parseString("abc"))
// {
//     status: "complete",
//     index: 0,
//     result: null,
//     error: null
// }
```

### lazy
Takes a function that returns a parser and returns a parser that defers the creation of the parser until it is needed. Useful for creating recursive parsers

```js
const arrayValueParser = lazy(() => 
    oneOf([
        numberParser,
        stringParser,
        arrayParser
    ])
)
const betweenSquareBrackes = parser => (
    sequenceOf([
        literal("["),
        parser,
        literal("]")
    ]).map(results => results[1])
)
const commaSeparated = parser => (
    sequenceOf([
        parser,
        zeroOrMore(
            sequenceOf([
                literal(","),
                parser
            ]).map(results => results[1])
        )
    ]).map(([first, rest]) => [first, ...rest]])
)
const arrayParser = (
    betweenSquareBrackes(
        optional(
            commaSeparated(arrayValueParser)
        ).map(result => result ?? [])
    )
)

console.log(arrayParser.parseString('[1,["two",3],4]'))
// {
//     status: "complete",
//     index: 13,
//     result: [1, ["two", 3], 4],
//     error: null
// }
```

## Roadmap to v0.1.0

- [ ] `.parseAsyncIterable()` - Parse async iterable inputs
- [ ] `.parseReadableStream()` - Parse ReadableStream inputs
- [ ] `.createParserTransformStream()` - Create transform streams from parsers
- [ ] Support for left recursion in grammars

## Acknowledgements
This library was inspired by the following projects and resources:

- [Arcsecond](https://github.com/francisrstokes/arcsecond)
- [Parser Combinators From Scratch](https://www.youtube.com/playlist?list=PLP29wDx6QmW5yfO1LAgO8kU3aQEj8SIrU)
- [PEG Parsing Series by Guido van Rossum](https://medium.com/@gvanrossum_83706/peg-parsing-series-de5d41b2ed60)
- [Packrat Parsing from Scratch by Bruce Hill](https://blog.bruce-hill.com/packrat-parsing-from-scratch)
- [Packrat Parsers Can Support Left Recursion: Warth et al.](https://web.cs.ucla.edu/~todd/research/pepm08.pdf)
- [Parsing Expression Grammar](https://en.wikipedia.org/wiki/Parsing_expression_grammar)
