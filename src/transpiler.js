export function transpile(cst) {
  let clarityCode = [];

  function visit(node) {
    if (node.name === 'program') {
      node.children.constantDef?.forEach(visit);
      node.children.mapDef?.forEach(visit);
      node.children.functionDef?.forEach(visit);
    } else if (node.name === 'constantDef') {
      const name = node.children.Identifier[0].image;
      const value = node.children.Number[0].image;
      clarityCode.push(`(define-constant ${name} u${value})`);
    } else if (node.name === 'mapDef') {
      const name = node.children.Identifier[0].image;
      const type = node.children.MapType[0].image;
      const [keyType, valueType] = type.slice(1, -1).split(':').map(t => t.trim());
      clarityCode.push(`(define-map ${name} ${keyType} ${valueType})`);
    } else if (node.name === 'functionDef') {
      const name = node.children.Identifier[0].image;
      const params = visitParameters(node.children.parameters[0]);
      const returnType = visitType(node.children.returnType[0].children.type[0]);
      const body = visitBody(node.children.body[0]);
      const isPublic = returnType.startsWith('(response');
      clarityCode.push(`(define-${isPublic ? 'public' : 'private'} (${name} ${params})\n  ${body.join('\n  ')})`);
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
    if (node.name === 'StrType') {
      const length = node.image.match(/\d+/)[0];
      return `(string-ascii ${length})`;
    } else if (node.name === 'BoolType') {
      return 'bool';
    } else if (node.name === 'IntType') {
      return 'int';
    } else if (node.name === 'responseType') {
      const types = node.image.match(/\[([^,]+),\s*([^\]]+)\]/);
      const okType = types[1].startsWith('str') ? `(string-ascii ${types[1].match(/\d+/)?.[0] || 41})` : types[1];
      const errType = types[2];
      return `(response ${okType} ${errType})`;
    } else if (node.name === 'MapType') {
      const [keyType, valueType] = node.image.slice(1, -1).split(':').map(t => t.trim());
      return `{${keyType}: ${valueType}}`;
    }
    return 'unknown';
  }

  function visitBody(node) {
    return node.children.statement?.map(visitStatement) || [];
  }

  function visitStatement(node) {
    if (node.name === 'returnStmt') {
      return visitExpression(node.children.expression[0]);
    } else if (node.name === 'ifStmt') {
      const condition = visitExpression(node.children.expression[0]);
      const body = visitBody(node.children.body[0]);
      return `(if ${condition}\n    (begin\n      ${body.join('\n      ')}))`;
    } else if (node.name === 'assertStmt') {
      const condition = visitExpression(node.children.expression[0]);
      const error = visitExpression(node.children.expression[1]);
      return `(asserts! ${condition} (err ${error}))`;
    }
  }

  function visitExpression(node) {
    if (node.name === 'literal') {
      const literal = node.children.TrueLiteral?.[0]?.image || node.children.FalseLiteral?.[0]?.image || node.children.StringLiteral?.[0]?.image || node.children.Number?.[0]?.image;
      if (literal === 'True') return 'true';
      if (literal === 'False') return 'false';
      if (node.children.Number) return `u${literal}`;
      return literal;
    } else if (node.name === 'Identifier') {
      return node.children.Identifier[0].image;
    } else if (node.name === 'okExpr') {
      const expr = visitExpression(node.children.expression[0]);
      return `(ok ${expr})`;
    } else if (node.name === 'errExpr') {
      const expr = visitExpression(node.children.expression[0]);
      return `(err ${expr})`;
    } else if (node.name === 'lenExpr') {
      const expr = visitExpression(node.children.expression[0]);
      return `(len ${expr})`;
    } else if (node.name === 'binaryExpr') {
      const left = visitExpression(node.children.left[0]);
      const right = visitExpression(node.children.right[0]);
      const op = node.children.EqualEqual ? 'is-eq' : 'not (is-eq';
      return `(${op} ${left} ${right})${op === 'not (is-eq' ? ')' : ''}`;
    }
    return '';
  }

  visit(cst);
  return clarityCode.join('\n\n');
}