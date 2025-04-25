export function transpile(cst, options = {}) {
  const { includeComments = true } = options;
  let clarityCode = [];

  /**
   * Converts a Python comment or docstring to Clarity comment format.
   * @param {Object} node - CST node (comment or docstring)
   * @returns {string} Clarity comment with ;; prefix or empty string if comments are disabled
   */
  function visitComment(node) {
    if (!includeComments || !node) {
      console.log('[DEBUG] visitComment: Skipping (comments disabled or node missing)');
      return '';
    }
    console.log('[DEBUG] visitComment: Node name:', node.name, 'Children:', Object.keys(node.children || {}));
    let commentText;
    if (node.name === 'docstring') {
      // Handle docstring as a direct StringLiteral or nested
      const docstring = node.children?.StringLiteral?.[0]?.image || node.children?.StringLiteral?.image || '';
      console.log('[DEBUG] visitComment: Raw docstring:', docstring);
      commentText = docstring.replace(/^['"]{1,3}|['"]{1,3}$/g, '').trim(); // Remove single/triple quotes
      console.log('[DEBUG] visitComment: Processed docstring:', commentText);
    } else if (node.name === 'comment') {
      const comment = node.children?.Comment?.[0]?.image || node.image || '';
      console.log('[DEBUG] visitComment: Raw comment:', comment);
      commentText = comment.replace(/^#/, '').trim(); // Remove # and trim
      console.log('[DEBUG] visitComment: Processed comment:', commentText);
    } else {
      console.log('[DEBUG] visitComment: Invalid node type');
      return '';
    }
    if (!commentText) {
      console.log('[DEBUG] visitComment: Empty comment text');
      return '';
    }
    const output = commentText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => `;; ${line}`)
      .join('\n  ');
    console.log('[DEBUG] visitComment: Output:', output);
    return output;
  }

  function visit(node) {
    console.log('[DEBUG] visit: Node name:', node.name);
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
      console.log('[DEBUG] visit: Processing functionDef, has docstring:', !!node.children?.docstring);
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
      console.log('[DEBUG] visit: FunctionDef output:', functionDef);
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
    if (!node || !node.children) {
      console.log('[DEBUG] visitBody: Empty node');
      return '';
    }
    console.log('[DEBUG] visitBody: Statements:', (node.children.statement || []).length, 'Comments:', (node.children.comment || []).length);
    const statements = [];
    const children = [...(node.children.comment || []), ...(node.children.statement || [])];
    children.sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));
    children.forEach(child => {
      if (child.name === 'comment') {
        const comment = visitComment(child);
        console.log('[DEBUG] visitBody: Processed comment:', comment);
        if (comment) statements.push(comment);
      } else if (child.name === 'statement') {
        const result = visitStatement(child);
        console.log('[DEBUG] visitBody: Processed statement:', result);
        if (result && result !== '""') statements.push(result);
      }
    });
    const output = statements.filter(s => s).join('\n  ');
    console.log('[DEBUG] visitBody: Output:', output);
    return output;
  }

  function visitStatement(node) {
    if (!node) {
      console.log('[DEBUG] visitStatement: Empty node');
      return '';
    }
    console.log('[DEBUG] visitStatement: Node children:', Object.keys(node.children || {}));
    if (node.children?.returnStmt) {
      console.log('[DEBUG] visitStatement: Return statement');
      return visitStatement(node.children.returnStmt[0]);
    } else if (node.children?.ifStmt) {
      console.log('[DEBUG] visitStatement: If statement');
      const ifStmt = node.children.ifStmt[0];
      const condition = visitExpression(ifStmt.children.expression[0]);
      console.log('[DEBUG] visitStatement: If condition:', condition);
      const ifBody = ifStmt.children.body[0];
      const ifBodyStmts = ifBody.children.statement || [];
      console.log('[DEBUG] visitStatement: If body statements:', ifBodyStmts.length);
      if (ifBodyStmts.length >= 1 && ifBodyStmts[0].children?.returnStmt) {
        console.log('[DEBUG] visitStatement: Matched if-return pattern');
        const thenExpr = visitExpression(ifBodyStmts[0].children.returnStmt[0].children.expression[0]);
        console.log('[DEBUG] visitStatement: Then expr:', thenExpr);
        // Collect all statements after the ifStmt in the parent body
        const parentBody = node.parentCtx?.children?.statement || [];
        const currentIdx = parentBody.indexOf(node);
        let elseExpr = '';
        let foundElse = false;
        for (let i = currentIdx + 1; i < parentBody.length; i++) {
          if (parentBody[i].children?.returnStmt) {
            elseExpr = visitExpression(parentBody[i].children.returnStmt[0].children.expression[0]);
            console.log('[DEBUG] visitStatement: Else expr:', elseExpr);
            foundElse = true;
            break;
          }
        }
        if (foundElse) {
          const ifBlock = `(if ${condition}\n    ${thenExpr}\n    ${elseExpr})`;
          console.log('[DEBUG] visitStatement: If output:', ifBlock);
          return ifBlock;
        }
        // Fallback: Only if no else branch is found
        const ifBodyOutput = visitBody(ifBody);
        console.log('[DEBUG] visitStatement: Fallback if body:', ifBodyOutput);
        return `(if ${condition}\n    (begin\n      ${ifBodyOutput}\n    )\n    (ok true))`;
      }
    } else if (node.children?.assertStmt) {
      console.log('[DEBUG] visitStatement: Assert statement');
      const condition = visitExpression(node.children.expression[0]);
      const error = visitExpression(node.children.expression[1]);
      return `(asserts! ${condition} (err ${error}))`;
    } else if (node.children?.expression) {
      console.log('[DEBUG] visitStatement: Expression');
      return visitExpression(node.children.expression[0]);
    } else if (node.name === 'returnStmt') {
      console.log('[DEBUG] visitStatement: Return');
      const expr = visitExpression(node.children.expression[0]);
      console.log('[DEBUG] visitStatement: Return expr:', expr);
      return expr;
    } else if (node.name === 'expression') {
      console.log('[DEBUG] visitStatement: Direct expression');
      return visitExpression(node);
    }
    console.log('[DEBUG] visitStatement: Empty');
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
    if (!node) {
      console.log('[DEBUG] visitExpression: Empty node');
      return '';
    }
    console.log('[DEBUG] visitExpression: Node children:', Object.keys(node.children || {}));
    if (node.children?.Not) {
      console.log('[DEBUG] visitExpression: Not');
      const expr = visitExpression(node.children.notExpr[0]);
      return `(not ${expr})`;
    }
    if (node.children?.leftExpr) {
      console.log('[DEBUG] visitExpression: Comparison');
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
        console.log('[DEBUG] visitExpression: Identifier:', id);
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
        console.log('[DEBUG] visitExpression: String literal:', str);
        return str;
      } else if (node.children.Number) return `u${node.children.Number[0].image}`;
      return 'null';
    }
    if (node.name === 'functionCall') {
      // Get the expression (arguments) first
      const expr = node.children.expression ? visitExpression(node.children.expression[0]) : '';

      if (node.children.Ok) {
        console.log('[DEBUG] visitExpression: Ok call:', expr);
        return `(ok ${expr})`;
      } else if (node.children.Err) {
        console.log('[DEBUG] visitExpression: Err call:', expr);
        return `(err ${expr})`;
      } else if (node.children.Len) {
        console.log('[DEBUG] visitExpression: Len call:', expr);
        return `(len ${expr})`;
      } else if (node.children.Identifier) {
        const funcName = transformIdentifier(node.children.Identifier[0].image);
        console.log('[DEBUG] visitExpression: Function call:', funcName, expr);
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
      console.log('[DEBUG] visitExpression: Identifier:', id);
      return id;
    }
    return '';
  }

  console.log('[DEBUG] transpile: Starting');
  visit(cst);
  console.log('[DEBUG] transpile: Final output:', clarityCode.join('\n\n'));
  return clarityCode.join('\n\n');
}