import { createToken, Lexer, CstParser } from 'chevrotain';

// Define all tokens first
const EqualEqual = createToken({ name: 'EqualEqual', pattern: /==/ });
const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
const Equal = createToken({ name: 'Equal', pattern: /=/ });
const Arrow = createToken({ name: 'Arrow', pattern: /->/ });

// Keywords
const Def = createToken({ name: 'Def', pattern: /def/ });
const Map = createToken({ name: 'Map', pattern: /map/ });
const Return = createToken({ name: 'Return', pattern: /return/ });
const If = createToken({ name: 'If', pattern: /if/ });
const Assert = createToken({ name: 'Assert', pattern: /assert/ });
const Ok = createToken({ name: 'Ok', pattern: /Ok/ });
const Err = createToken({ name: 'Err', pattern: /Err/ });
const Len = createToken({ name: 'Len', pattern: /len/ });
const TrueLiteral = createToken({ name: 'TrueLiteral', pattern: /True/ });
const FalseLiteral = createToken({ name: 'FalseLiteral', pattern: /False/ });

// Types
const StrType = createToken({ name: 'StrType', pattern: /str\[\d+\]/ });
const BoolType = createToken({ name: 'BoolType', pattern: /bool/ });
const IntType = createToken({ name: 'IntType', pattern: /int/ });
const ResponseType = createToken({ name: 'ResponseType', pattern: /Response\[[^\]]+\]/ });
const MapType = createToken({ name: 'MapType', pattern: /\{[^}]+\}/ });

// General tokens (must come after keywords and types)
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][\w-]*/ });
const Number = createToken({ name: 'Number', pattern: /\d+/ });
const StringLiteral = createToken({ name: 'StringLiteral', pattern: /"[^"]*"/ });

// Punctuation
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
const Colon = createToken({ name: 'Colon', pattern: /:/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });

// Whitespace
const Whitespace = createToken({ name: 'Whitespace', pattern: /\s+/, group: Lexer.SKIPPED });
const Newline = createToken({ name: 'Newline', pattern: /\n/, group: Lexer.SKIPPED });

// The order in this array determines the matching priority
const allTokens = [
    // Operators (longest match first)
    EqualEqual,
    NotEqual,
    Equal,
    Arrow,
    
    // Keywords
    Def,
    Map,
    Return,
    If,
    Assert,
    Ok,
    Err,
    Len,
    TrueLiteral,
    FalseLiteral,
    
    // Types
    StrType,
    ResponseType,
    MapType,
    BoolType,
    IntType,
    
    // Punctuation
    LParen,
    RParen,
    LBracket,
    RBracket,
    LBrace,
    RBrace,
    Colon,
    Comma,
    
    // General tokens (must come after keywords and types)
    StringLiteral,
    Number,
    Identifier,  // Identifier must come after all keywords and types
    
    // Whitespace last
    Whitespace,
    Newline
];

export const lexer = new Lexer(allTokens);

export class ClarityParser extends CstParser {
  constructor() {
    super(allTokens);
    const $ = this;

    $.RULE('program', () => {
      $.MANY(() => {
        $.OR([
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

    $.RULE('mapDef', () => {
      $.CONSUME(Map);
      $.CONSUME(Identifier);
      $.CONSUME(Colon);
      $.CONSUME(MapType);
    });

    $.RULE('functionDef', () => {
      $.CONSUME(Def);
      $.CONSUME(Identifier);
      $.SUBRULE($.parameters);
      $.SUBRULE($.returnType);
      $.CONSUME(Colon);
      $.SUBRULE($.body);
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
        { ALT: () => $.CONSUME(StrType) },
        { ALT: () => $.CONSUME(BoolType) },
        { ALT: () => $.CONSUME(IntType) },
        { ALT: () => $.SUBRULE($.responseType) },
        { ALT: () => $.CONSUME(MapType) }
      ]);
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
        $.SUBRULE($.statement);
      });
    });

    $.RULE('statement', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.returnStmt) },
        { ALT: () => $.SUBRULE($.ifStmt) },
        { ALT: () => $.SUBRULE($.assertStmt) },
        { ALT: () => $.SUBRULE($.expression) }
      ]);
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
      $.SUBRULE($.atomicExpression);
      $.MANY(() => {
        $.OR([
          { 
            ALT: () => {
              $.OR2([
                { ALT: () => $.CONSUME(EqualEqual) },
                { ALT: () => $.CONSUME(NotEqual) }
              ]);
              $.SUBRULE2($.atomicExpression);
            }
          }
        ]);
      });
    });

    $.RULE('atomicExpression', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.literal) },
        { ALT: () => $.CONSUME(Identifier) },
        { ALT: () => $.SUBRULE($.okExpr) },
        { ALT: () => $.SUBRULE($.errExpr) },
        { ALT: () => $.SUBRULE($.lenExpr) },
        { ALT: () => {
            $.CONSUME(LParen);
            $.SUBRULE($.expression);
            $.CONSUME(RParen);
          }
        }
      ]);
    });

    $.RULE('literal', () => {
      $.OR([
        { ALT: () => $.CONSUME(TrueLiteral) },
        { ALT: () => $.CONSUME(FalseLiteral) },
        { ALT: () => $.CONSUME(StringLiteral) },
        { ALT: () => $.CONSUME(Number) }
      ]);
    });

    $.RULE('okExpr', () => {
      $.CONSUME(Ok);
      $.CONSUME(LParen);
      $.SUBRULE($.expression);
      $.CONSUME(RParen);
    });

    $.RULE('errExpr', () => {
      $.CONSUME(Err);
      $.CONSUME(LParen);
      $.SUBRULE($.expression);
      $.CONSUME(RParen);
    });

    $.RULE('lenExpr', () => {
      $.CONSUME(Len);
      $.CONSUME(LParen);
      $.SUBRULE($.expression);
      $.CONSUME(RParen);
    });

    // binaryExpr rule removed as it's now handled in expression

    this.performSelfAnalysis();
  }
}
