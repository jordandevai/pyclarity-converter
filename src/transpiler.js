export function transpile(cst) {
  let clarityCode = [];

  function visit(node) {
    if (node.name === 'program') {
      // Skip import statements in output
      node.children.constantDef?.forEach(visit);
      node.children.mapDef?.forEach(visit);
      node.children.functionDef?.forEach(visit);
    } else if (node.name === 'constantDef') {
      const name = node.children.Identifier[0].image;
      const value = node.children.Number[0].image;
      clarityCode.push(`(define-constant ${name} u${value})`);
    } else if (node.name === 'mapDef') {
      const name = node.children.Identifier[0].image;
      const mapType = node.children.MapType[0].image;
      // Extract key and value types from the Dict syntax
      const mapTypeMatch = mapType.match(/Dict\[([^,]+),\s*([^\]]+)\]/);
      if (mapTypeMatch) {
        const [_, keyType, valueType] = mapTypeMatch;
        clarityCode.push(`(define-map ${name} ${keyType.trim()} ${valueType.trim()})`);
      }
    } else if (node.name === 'functionDef') {
      const decorator = node.children.Public ? 'define-public' :
                       node.children.Readonly ? 'define-read-only' :
                       'define-private';
      const name = node.children.Identifier[0].image;
      const params = visitParameters(node.children.parameters[0]);
      // We don't need to use returnType in the output since Clarity infers it
      visitType(node.children.returnType[0]); // Just process it but don't use the result
      const body = visitBody(node.children.body[0]);

      // Add docstring as comment if present
      let docComment = "";
      if (node.children.docstring?.[0]?.children?.StringLiteral) {
        const docstring = node.children.docstring[0].children.StringLiteral[0].image;
        // Remove quotes and split by lines
        const docLines = docstring.slice(1, -1).split('\n');
        // Format each line with proper comment syntax
        docComment = docLines.map(line => `;; ${line.trim()}`).join('\n');
      }

      // Build the function definition with optional docstring comments
      const functionDef = `(${decorator} (${name} ${params})${docComment ? '\n  ' + docComment : ''}${body ? '\n  ' + body : ''})`;
      clarityCode.push(functionDef);
    } else if (node.name === 'type') {
      if (node.children.FixedString) {
        const size = node.children.Number[0].image;
        return `(string-ascii ${size})`;
      } else if (node.children.ResponseType) {
        const responseType = node.children.ResponseType[0].image;
        const typeMatch = responseType.match(/Response\[([^,]+),\s*([^\]]+)\]/);
        if (typeMatch) {
          const [_, okType, errType] = typeMatch;
          return `(response ${okType.trim()} ${errType.trim()})`;
        }
        return '(response bool int)'; // Default fallback
      }
      // ... handle other types ...
    }
  }

  function visitParameters(node) {
    const params = node.children.Identifier?.map((id, i) => {
      const type = visitType(node.children.type[i]);
      return `(${id.image} ${type})`;
    }) || [];
    return params.join(' ');
  }

  function visitType(node) {
    if (node.children && node.children.fixedStringType) {
      return visitType(node.children.fixedStringType[0]);
    } else if (node.name === 'fixedStringType') {
      const size = node.children.Number[0].image;
      return `(string-ascii ${size})`;
    } else if (node.children && node.children.StrType) {
      return visitType(node.children.StrType[0]);
    } else if (node.name === 'StrType') {
      const length = node.image.match(/\d+/)[0];
      return `(string-ascii ${length})`;
    } else if (node.children && node.children.BoolType) {
      return 'bool';
    } else if (node.name === 'BoolType') {
      return 'bool';
    } else if (node.children && node.children.IntType) {
      return 'int';
    } else if (node.name === 'IntType') {
      return 'int';
    } else if (node.children && node.children.UintType) {
      return 'uint';
    } else if (node.name === 'UintType') {
      return 'uint';
    } else if (node.children && node.children.PrincipalType) {
      return 'principal';
    } else if (node.name === 'PrincipalType') {
      return 'principal';
    } else if (node.children && node.children.ResponseType) {
      return visitType(node.children.ResponseType[0]);
    } else if (node.name === 'ResponseType') {
      const responseType = node.image;
      const typeMatch = responseType.match(/Response\[([^,]+),\s*([^\]]+)\]/);
      if (typeMatch) {
        const [_, okType, errType] = typeMatch;
        return `(response ${okType.trim()} ${errType.trim()})`;
      }
      return '(response bool int)'; // Default fallback
    } else if (node.children && node.children.MapType) {
      return visitType(node.children.MapType[0]);
    } else if (node.name === 'MapType') {
      const mapType = node.image;
      const [keyType, valueType] = mapType.slice(1, -1).split(':').map(t => t.trim());
      return `{${keyType}: ${valueType}}`;
    }
    return 'unknown';
  }

  function visitBody(node) {
    if (!node || !node.children || !node.children.statement) {
      return '';
    }

    // Process each statement in the body
    const statements = node.children.statement.map(stmt => visitStatement(stmt));
    // Filter out empty statements and join with newlines
    return statements.filter(s => s).join('\n      ');
  }

  function visitStatement(node) {
    if (!node) return '';

    if (node.children && node.children.returnStmt) {
      return visitStatement(node.children.returnStmt[0]);
    } else if (node.children && node.children.ifStmt) {
      return visitStatement(node.children.ifStmt[0]);
    } else if (node.children && node.children.assertStmt) {
      return visitStatement(node.children.assertStmt[0]);
    } else if (node.children && node.children.expression) {
      return visitExpression(node.children.expression[0]);
    } else if (node.name === 'returnStmt') {
      // For return statements, we just return the expression directly
      // since Clarity doesn't have explicit return statements
      return visitExpression(node.children.expression[0]);
    } else if (node.name === 'ifStmt') {
      const condition = visitExpression(node.children.expression[0]);
      const body = visitBody(node.children.body[0]);
      if (body) {
        return `(if ${condition}\n    (begin\n      ${body}\n    ))`;
      } else {
        return `(if ${condition} true)`; // Default if body is empty
      }
    } else if (node.name === 'assertStmt') {
      const condition = visitExpression(node.children.expression[0]);
      const error = visitExpression(node.children.expression[1]);
      return `(asserts! ${condition} (err ${error}))`;
    } else if (node.name === 'expression') {
      return visitExpression(node);
    }

    return '';
  }

  function visitExpression(node) {
    if (!node) return '';

    // Handle 'not' expressions
    if (node.children && node.children.Not) {
      const expr = visitExpression(node.children.notExpr[0]);
      return `(not ${expr})`;
    }

    // Handle comparison expressions
    if (node.children && node.children.leftExpr) {
      const left = visitExpression(node.children.leftExpr[0]);

      // If there's a comparison operator
      if (node.children.EqualEqual || node.children.NotEqual ||
          node.children.GreaterThan || node.children.LessThan ||
          node.children.GreaterThanEqual || node.children.LessThanEqual) {

        const right = visitExpression(node.children.rightExpr[0]);

        let op;
        if (node.children.EqualEqual) {
          op = 'is-eq';
        } else if (node.children.NotEqual) {
          op = 'not (is-eq';
        } else if (node.children.GreaterThan) {
          op = '>';
        } else if (node.children.LessThan) {
          op = '<';
        } else if (node.children.GreaterThanEqual) {
          op = '>=';
        } else if (node.children.LessThanEqual) {
          op = '<=';
        }

        if (op === 'not (is-eq') {
          return `(${op} ${left} ${right}))`;
        } else {
          return `(${op} ${left} ${right})`;
        }
      }

      // Just return the left expression if there's no comparison
      return left;
    }

    // Handle atomic expressions
    if (node.name === 'atomicExpression') {
      if (node.children.literal) {
        return visitExpression(node.children.literal[0]);
      } else if (node.children.methodCall) {
        return visitExpression(node.children.methodCall[0]);
      } else if (node.children.functionCall) {
        return visitExpression(node.children.functionCall[0]);
      } else if (node.children.Identifier) {
        return node.children.Identifier[0].image;
      } else if (node.children.expression) {
        return visitExpression(node.children.expression[0]);
      }
      return '';
    }

    // Handle literals
    if (node.name === 'literal') {
      if (node.children.TrueLiteral) {
        return 'true';
      } else if (node.children.FalseLiteral) {
        return 'false';
      } else if (node.children.StringLiteral) {
        // Keep the quotes for string literals
        const stringLiteral = node.children.StringLiteral[0].image;
        return stringLiteral;
      } else if (node.children.Number) {
        return `u${node.children.Number[0].image}`;
      }
      return 'null';
    }

    // Handle function calls
    if (node.name === 'functionCall') {
      if (node.children.Ok) {
        const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
        return `(ok ${expr})`;
      } else if (node.children.Err) {
        const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
        return `(err ${expr})`;
      } else if (node.children.Identifier) {
        const funcName = node.children.Identifier[0].image;
        const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
        return `(${funcName} ${expr})`;
      }
    }

    // Handle method calls
    if (node.name === 'methodCall') {
      const object = node.children.Identifier[0].image;
      const method = node.children.Identifier[1].image;
      const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';

      // Handle Response.ok and Response.err methods
      if (object === 'Response' && method === 'ok') {
        return `(ok ${expr})`;
      } else if (object === 'Response' && method === 'err') {
        return `(err ${expr})`;
      } else if (method === 'ok' || method === 'Ok') {
        return `(ok ${expr})`;
      } else if (method === 'err' || method === 'Err') {
        return `(err ${expr})`;
      }

      return `(${object}.${method} ${expr})`;
    }

    // Handle identifiers
    if (node.name === 'Identifier') {
      return node.children.Identifier[0].image;
    }

    return '';
  }

  visit(cst);
  return clarityCode.join('\n\n');
}
