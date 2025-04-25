export function transpile(cst, options = {}) {
  const { includeComments = true } = options;
  let clarityCode = [];

  /**
   * Converts a Python comment or docstring to Clarity comment format.
   * @param {Object} node - CST node (comment or docstring)
   * @returns {string} Clarity comment with ;; prefix or empty string if comments are disabled
   */
  function visitComment(node) {
    if (!includeComments || !node) return '';
    let commentText;
    if (node.name === 'docstring') {
      const docstring = node.children?.StringLiteral?.[0]?.image || '';
      commentText = docstring.slice(1, -1).trim(); // Remove quotes and trim
    } else if (node.name === 'comment') {
      commentText = node.children?.Comment?.[0]?.image?.slice(1).trim() || '';
    } else {
      return '';
    }
    if (!commentText) return '';
    return commentText
      .split('\n')
      .map(line => `;; ${line.trim()}`)
      .filter(line => line !== ';;')
      .join('\n  ');
  }

  function visit(node) {
    if (node.name === 'program') {
      node.children.comment?.forEach(c => {
        const comment = visitComment(c);
        if (comment) clarityCode.push(comment);
      });
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
      const mapTypeMatch = mapType.match(/Dict\[([^,]+),\s*([^\]]+)\]/);
      let mapDef = '';
      if (mapTypeMatch) {
        const [_, keyType, valueType] = mapTypeMatch;
        mapDef = `(define-map ${name} ${keyType.trim()} ${valueType.trim()})`;
      }
      node.children.comment?.forEach(c => {
        const comment = visitComment(c);
        if (comment) mapDef += `\n${comment}`;
      });
      clarityCode.push(mapDef);
    } else if (node.name === 'functionDef') {
      const decorator = node.children.Public ? 'define-public' :
                        node.children.Readonly ? 'define-read-only' :
                        'define-private';
      const name = transformIdentifier(node.children.Identifier[0].image);
      const params = visitParameters(node.children.parameters[0]);
      visitType(node.children.returnType[0]);
      const body = visitBody(node.children.body[0]);

      let functionDef = `(${decorator} (${name} ${params})`;
      const docstring = visitComment(node.children.docstring?.[0]);
      if (docstring) {
        functionDef += `\n  ${docstring}`;
      }
      if (body) {
        functionDef += `\n  ${body}`;
      }
      node.children.comment?.forEach(c => {
        const comment = visitComment(c);
        if (comment) {
          functionDef += `\n  ${comment}`;
        }
      });
      functionDef += ')';
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
        return '(response bool int)';
      }
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
    if (node.children?.fixedStringType) {
      return visitType(node.children.fixedStringType[0]);
    } else if (node.name === 'fixedStringType') {
      const size = node.children.Number[0].image;
      return `(string-ascii ${size})`;
    } else if (node.children?.StrType) {
      return visitType(node.children.StrType[0]);
    } else if (node.name === 'StrType') {
      const length = node.image.match(/\d+/)[0];
      return `(string-ascii ${length})`;
    } else if (node.children?.BoolType || node.name === 'BoolType') {
      return 'bool';
    } else if (node.children?.IntType || node.name === 'IntType') {
      return 'int';
    } else if (node.children?.UintType || node.name === 'UintType') {
      return 'uint';
    } else if (node.children?.PrincipalType || node.name === 'PrincipalType') {
      return 'principal';
    } else if (node.children?.ResponseType) {
      return visitType(node.children.ResponseType[0]);
    } else if (node.name === 'ResponseType') {
      const responseType = node.image;
      const typeMatch = responseType.match(/Response\[([^,]+),\s*([^\]]+)\]/);
      if (typeMatch) {
        const [_, okType, errType] = typeMatch;
        return `(response ${okType.trim()} ${errType.trim()})`;
      }
      return '(response bool int)';
    } else if (node.children?.MapType) {
      return visitType(node.children.MapType[0]);
    } else if (node.name === 'MapType') {
      const mapType = node.image;
      const [keyType, valueType] = mapType.slice(1, -1).split(':').map(t => t.trim());
      return `{${keyType}: ${valueType}}`;
    }
    return 'unknown';
  }

  function visitBody(node) {
    if (!node || !node.children) return '';
    const statements = [];
    // Process comments and statements in order
    const children = [...(node.children.comment || []), ...(node.children.statement || [])];
    children.sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0)); // Sort by position
    children.forEach(child => {
      if (child.name === 'comment') {
        const comment = visitComment(child);
        if (comment) statements.push(comment);
      } else if (child.name === 'statement') {
        const result = visitStatement(child);
        if (result) statements.push(result);
      }
    });
    return statements.filter(s => s).join('\n  ');
  }

  function visitStatement(node) {
    if (!node) return '';
    if (node.children?.returnStmt) {
      return visitStatement(node.children.returnStmt[0]);
    } else if (node.children?.ifStmt) {
      const ifStmt = node.children.ifStmt[0];
      const condition = visitExpression(ifStmt.children.expression[0]);
      const ifBody = visitBody(ifStmt.children.body[0]);
      // Handle if-return pattern
      const ifBodyStmts = ifStmt.children.body[0].children.statement || [];
      if (ifBodyStmts.length === 1 && ifBodyStmts[0].children?.returnStmt) {
        const thenExpr = visitExpression(ifBodyStmts[0].children.returnStmt[0].children.expression[0]);
        // Look for a following return statement in the parent body
        const parentStmts = node.parentCtx?.children?.statement || [];
        const idx = parentStmts.indexOf(node);
        if (idx + 1 < parentStmts.length && parentStmts[idx + 1].children?.returnStmt) {
          const elseExpr = visitExpression(parentStmts[idx + 1].children.returnStmt[0].children.expression[0]);
          return `(if ${condition}\n    ${thenExpr}\n    ${elseExpr})`;
        }
      }
      // Fallback: General if statement
      return `(if ${condition}\n    (begin\n      ${ifBody}\n    )\n    (ok true))`;
    } else if (node.children?.assertStmt) {
      const condition = visitExpression(node.children.expression[0]);
      const error = visitExpression(node.children.expression[1]);
      return `(asserts! ${condition} (err ${error}))`;
    } else if (node.children?.expression) {
      return visitExpression(node.children.expression[0]);
    } else if (node.name === 'returnStmt') {
      const expr = visitExpression(node.children.expression[0]);
      return expr;
    } else if (node.name === 'expression') {
      return visitExpression(node);
    }
    return '';
  }

  function transformIdentifier(id) {
    const transformed = id.replace(/^_+/, '').replace(/_/g, '-');
    if (!transformed || transformed.startsWith('-')) {
      throw new Error(`Invalid Clarity identifier: ${transformed}`);
    }
    return transformed;
  }

  function visitExpression(node) {
    if (!node) return '';
    if (node.children?.Not) {
      const expr = visitExpression(node.children.notExpr[0]);
      return `(not ${expr})`;
    }
    if (node.children?.leftExpr) {
      const left = visitExpression(node.children.leftExpr[0]);
      if (node.children.EqualEqual || node.children.NotEqual ||
          node.children.GreaterThan || node.children.LessThan ||
          node.children.GreaterThanEqual || node.children.LessThanEqual) {
        const right = visitExpression(node.children.rightExpr[0]);
        let op;
        if (node.children.EqualEqual) op = 'is-eq';
        else if (node.children.NotEqual) op = 'not (is-eq';
        else if (node.children.GreaterThan) op = '>';
        else if (node.children.LessThan) op = '<';
        else if (node.children.GreaterThanEqual) op = '>=';
        else if (node.children.LessThanEqual) op = '<=';
        return op === 'not (is-eq' ? `(${op} ${left} ${right}))` : `(${op} ${left} ${right})`;
      }
      return left;
    }
    if (node.name === 'atomicExpression') {
      if (node.children.literal) {
        return visitExpression(node.children.literal[0]);
      } else if (node.children.methodCall) {
        return visitExpression(node.children.methodCall[0]);
      } else if (node.children.functionCall) {
        return visitExpression(node.children.functionCall[0]);
      } else if (node.children.Identifier) {
        const id = transformIdentifier(node.children.Identifier[0].image);
        return id;
      } else if (node.children.expression) {
        return visitExpression(node.children.expression[0]);
      }
      return '';
    }
    if (node.name === 'literal') {
      if (node.children.TrueLiteral) return 'true';
      else if (node.children.FalseLiteral) return 'false';
      else if (node.children.StringLiteral) {
        const str = node.children.StringLiteral[0].image;
        return str;
      } else if (node.children.Number) return `u${node.children.Number[0].image}`;
      return 'null';
    }
    if (node.name === 'functionCall') {
      if (node.children.Ok) {
        const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
        return `(ok ${expr})`;
      } else if (node.children.Err) {
        const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
        return `(err ${expr})`;
      } else if (node.children.Identifier) {
        const funcName = transformIdentifier(node.children.Identifier[0].image);
        const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
        return `(${funcName} ${expr})`;
      }
    }
    if (node.name === 'methodCall') {
      const object = node.children.Identifier[0].image;
      const method = node.children.Identifier[1].image;
      const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';
      if (object === 'Response' && method === 'ok') return `(ok ${expr})`;
      else if (object === 'Response' && method === 'err') return `(err ${expr})`;
      else if (method === 'ok' || method === 'Ok') return `(ok ${expr})`;
      else if (method === 'err' || method === 'Err') return `(err ${expr})`;
      return `(${object}.${method} ${expr})`;
    }
    if (node.name === 'Identifier') {
      const id = transformIdentifier(node.children.Identifier[0].image);
      return id;
    }
    return '';
  }

  visit(cst);
  return clarityCode.join('\n\n');
}