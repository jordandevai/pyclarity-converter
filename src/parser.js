import { createToken, Lexer, CstParser } from 'chevrotain';

// First define the Identifier token since it's used as a longer_alt
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][\w-]*/ });

// Define all other tokens
const EqualEqual = createToken({ name: 'EqualEqual', pattern: /==/ });
const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
const Equal = createToken({ name: 'Equal', pattern: /=/ });
const Arrow = createToken({ name: 'Arrow', pattern: /->/ });
const Dot = createToken({ name: 'Dot', pattern: /\./ });
const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
const LessThan = createToken({ name: 'LessThan', pattern: /</ });
const GreaterThanEqual = createToken({ name: 'GreaterThanEqual', pattern: />=/ });
const LessThanEqual = createToken({ name: 'LessThanEqual', pattern: /<=/ });

// Keywords
const Def = createToken({ name: 'Def', pattern: /def/, longer_alt: Identifier });
const Map = createToken({ name: 'Map', pattern: /map/, longer_alt: Identifier });
const Return = createToken({ name: 'Return', pattern: /return/, longer_alt: Identifier });
const If = createToken({ name: 'If', pattern: /if/, longer_alt: Identifier });
const Not = createToken({ name: 'Not', pattern: /not/, longer_alt: Identifier });
const Assert = createToken({ name: 'Assert', pattern: /assert/, longer_alt: Identifier });
const Ok = createToken({ name: 'Ok', pattern: /Ok/, longer_alt: Identifier });
const Err = createToken({ name: 'Err', pattern: /Err/, longer_alt: Identifier });
const Len = createToken({ name: 'Len', pattern: /len/, longer_alt: Identifier });
const TrueLiteral = createToken({ name: 'TrueLiteral', pattern: /True/, longer_alt: Identifier });
const FalseLiteral = createToken({ name: 'FalseLiteral', pattern: /False/, longer_alt: Identifier });

// Types
const StrType = createToken({ name: 'StrType', pattern: /str\[\d+\]/, longer_alt: Identifier });
const BoolType = createToken({ name: 'BoolType', pattern: /bool/, longer_alt: Identifier });
const IntType = createToken({ name: 'IntType', pattern: /int/, longer_alt: Identifier });
const UintType = createToken({ name: 'UintType', pattern: /uint/, longer_alt: Identifier });
const PrincipalType = createToken({ name: 'PrincipalType', pattern: /Principal/, longer_alt: Identifier });
const ResponseType = createToken({
    name: 'ResponseType',
    pattern: /Response\[[^\]]+,[^\]]+\]/,
    longer_alt: Identifier
});
const MapType = createToken({
    name: 'MapType',
    pattern: /Dict\[[^\]]+,[^\]]+\]/,
    longer_alt: Identifier
});

// Import tokens
const From = createToken({ name: 'From', pattern: /from/, longer_alt: Identifier });
const Import = createToken({ name: 'Import', pattern: /import/, longer_alt: Identifier });
const Public = createToken({ name: 'Public', pattern: /@public/, longer_alt: Identifier });
const Readonly = createToken({ name: 'Readonly', pattern: /@readonly/, longer_alt: Identifier });
const Private = createToken({ name: 'Private', pattern: /@private/, longer_alt: Identifier });
const MapDecorator = createToken({ name: 'MapDecorator', pattern: /@map_type/, longer_alt: Identifier });
const FixedString = createToken({ name: 'FixedString', pattern: /FixedString/, longer_alt: Identifier });

// Other tokens
const Number = createToken({ name: 'Number', pattern: /\d+/ });
const StringLiteral = createToken({ name: 'StringLiteral', pattern: /"[^"]*"/ });
const Comment = createToken({
    name: 'Comment',
    pattern: /#[^\n\r]*/
    // Removed group: 'comments' to include in main token stream
});
const Whitespace = createToken({
    name: 'Whitespace',
    pattern: /\s+/,
    group: Lexer.SKIPPED
});
const Newline = createToken({
    name: 'Newline',
    pattern: /\n\r|\r\n|\n|\r/,
    group: Lexer.SKIPPED
});

// Punctuation
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const Colon = createToken({ name: 'Colon', pattern: /:/ });

// The order in this array determines the matching priority
const allTokens = [
    // Operators (longest match first)
    GreaterThanEqual,
    LessThanEqual,
    EqualEqual,
    NotEqual,
    Equal,
    Arrow,
    Dot,
    GreaterThan,
    LessThan,

    // Keywords
    Def,
    Map,
    Return,
    If,
    Not,
    Assert,
    Ok,
    Err,
    Len,
    TrueLiteral,
    FalseLiteral,
    From,
    Import,
    Public,
    Readonly,
    Private,
    MapDecorator,
    FixedString,

    // Types
    StrType,
    ResponseType,
    MapType,
    BoolType,
    IntType,
    UintType,
    PrincipalType,

    // Punctuation
    LParen,
    RParen,
    LBracket,
    RBracket,
    LBrace,
    RBrace,
    Colon,
    Comma,

    // General tokens
    StringLiteral,
    Number,
    Identifier,  // Identifier must come after all keywords and types

    // Comments before whitespace
    Comment,

    // Whitespace last
    Whitespace,
    Newline
];

export const lexer = new Lexer(allTokens);

export class ClarityParser extends CstParser {
  constructor() {
    super(allTokens);
    const $ = this;

    // New comment rule
    $.RULE('comment', () => {
      $.CONSUME(Comment);
    });

    $.RULE('program', () => {
      $.MANY(() => $.SUBRULE($.importStatement));
      $.MANY2(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.comment) },
          { ALT: () => $.SUBRULE($.constantDef) },
          { ALT: () => $.SUBRULE($.mapDef) },
          { ALT: () => $.SUBRULE($.functionDef) }
        ]);
      });
    });

    $.RULE('constantDef', () => {
      $.CONSUME(Identifier);
      $.CONSUME(Equal);
      $.CONSUME(Number);
    });

    $.RULE('importStatement', () => {
      $.CONSUME(From);
      $.CONSUME(Identifier);
      $.CONSUME(Import);
      $.MANY_SEP({
        SEP: Comma,
        DEF: () => $.CONSUME2(Identifier)
      });
    });

    $.RULE('mapDef', () => {
      $.CONSUME(MapDecorator);
      $.CONSUME(Identifier);
      $.CONSUME(Colon);
      $.CONSUME(MapType);
    });

    $.RULE('functionDef', () => {
      $.OR([
        { ALT: () => $.CONSUME(Public) },
        { ALT: () => $.CONSUME(Readonly) },
        { ALT: () => $.CONSUME(Private) }
      ]);
      $.CONSUME(Def);
      $.CONSUME(Identifier);
      $.SUBRULE($.parameters);
      $.SUBRULE($.returnType);
      $.CONSUME(Colon);
      $.SUBRULE($.docstring);
      $.SUBRULE($.body);
      $.MANY(() => $.SUBRULE2($.comment)); // Allow trailing comments
    });

    $.RULE('docstring', () => {
      $.OPTION(() => {
        $.CONSUME(StringLiteral);
      });
    });

    $.RULE('parameters', () => {
      $.CONSUME(LParen);
      $.MANY_SEP({
        SEP: Comma,
        DEF: () => {
          $.CONSUME(Identifier);
          $.CONSUME(Colon);
          $.SUBRULE($.type);
        }
      });
      $.CONSUME(RParen);
    });

    $.RULE('type', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.fixedStringType) },
        { ALT: () => $.CONSUME(StrType) },
        { ALT: () => $.CONSUME(BoolType) },
        { ALT: () => $.CONSUME(IntType) },
        { ALT: () => $.CONSUME(UintType) },
        { ALT: () => $.CONSUME(PrincipalType) },
        { ALT: () => $.CONSUME(ResponseType) }, // Now handles Response[type1, type2] format
        { ALT: () => $.CONSUME(MapType) }
      ]);
    });

    $.RULE('fixedStringType', () => {
      $.CONSUME(FixedString);
      $.CONSUME(LParen);
      $.CONSUME(Number);
      $.CONSUME(RParen);
    });

    $.RULE('responseType', () => {
      $.CONSUME(ResponseType);
    });

    $.RULE('returnType', () => {
      $.CONSUME(Arrow);
      $.SUBRULE($.type);
    });

    $.RULE('body', () => {
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.statement) },
          { ALT: () => $.SUBRULE($.comment) }
        ]);
      });
    });

    $.RULE('statement', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.returnStmt) },
        { ALT: () => $.SUBRULE($.ifStmt) },
        { ALT: () => $.SUBRULE($.assertStmt) },
        { ALT: () => $.SUBRULE($.validExpression) } // New rule to filter expressions
      ]);
    });

    $.RULE('validExpression', () => {
      // Simplified rule to avoid ambiguity
      $.SUBRULE($.expression, { LABEL: 'expression' });
    });

    $.RULE('returnStmt', () => {
      $.CONSUME(Return);
      $.SUBRULE($.expression);
    });

    $.RULE('ifStmt', () => {
      $.CONSUME(If);
      $.SUBRULE($.expression);
      $.CONSUME(Colon);
      $.SUBRULE($.body);
    });

    $.RULE('assertStmt', () => {
      $.CONSUME(Assert);
      $.SUBRULE1($.expression);
      $.CONSUME(Comma);
      $.SUBRULE2($.expression);
    });

    $.RULE('expression', () => {
      $.OR([
        {
          // Handle 'not' expressions
          ALT: () => {
            $.CONSUME(Not);
            $.SUBRULE($.atomicExpression, { LABEL: 'notExpr' });
          }
        },
        {
          // Handle normal expressions with optional comparison operators
          ALT: () => {
            $.SUBRULE1($.atomicExpression, { LABEL: 'leftExpr' });
            $.OPTION(() => {
              $.OR2([
                { ALT: () => $.CONSUME(EqualEqual) },
                { ALT: () => $.CONSUME(NotEqual) },
                { ALT: () => $.CONSUME(GreaterThan) },
                { ALT: () => $.CONSUME(LessThan) },
                { ALT: () => $.CONSUME(GreaterThanEqual) },
                { ALT: () => $.CONSUME(LessThanEqual) }
              ]);
              $.SUBRULE2($.atomicExpression, { LABEL: 'rightExpr' });
            });
          }
        }
      ]);
    });

    $.RULE('atomicExpression', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.literal, { LABEL: 'literal' }) },
        { ALT: () => $.SUBRULE($.methodCall) },
        { ALT: () => $.SUBRULE($.functionCall) },
        { ALT: () => $.CONSUME(Identifier) },
        { ALT: () => {
            $.CONSUME(LParen);
            $.SUBRULE($.expression);
            $.CONSUME(RParen);
          }
        }
      ]);
    });

    $.RULE('functionCall', () => {
      $.OR([
        { ALT: () => $.CONSUME(Ok) },
        { ALT: () => $.CONSUME(Err) },
        { ALT: () => $.CONSUME(Len) }, // Keep Len as a special token for now
        { ALT: () => $.CONSUME(Identifier) }
      ]);
      $.CONSUME(LParen);
      $.OPTION(() => {
        $.SUBRULE($.expression);
      });
      $.CONSUME(RParen);
    });

    $.RULE('methodCall', () => {
      $.CONSUME(Identifier);
      $.CONSUME(Dot);
      $.CONSUME2(Identifier);
      $.CONSUME(LParen);
      $.OPTION(() => {
        $.SUBRULE($.expression);
      });
      $.CONSUME(RParen);
    });

    $.RULE('literal', () => {
      $.OR([
        { ALT: () => $.CONSUME(TrueLiteral) },
        { ALT: () => $.CONSUME(FalseLiteral) },
        { ALT: () => $.CONSUME(Number) },
        { ALT: () => $.CONSUME(StringLiteral) } // Add StringLiteral support
      ]);
    });



    // okExpr and errExpr rules removed as they're now handled by functionCall

    // lenExpr rule removed as it's now handled by functionCall

    // binaryExpr rule removed as it's now handled in expression

    this.performSelfAnalysis();
  }
}
