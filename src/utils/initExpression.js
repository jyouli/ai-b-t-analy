import Sval from 'sval';
import Expression from '@hecom/expression';
import sha256 from 'sha256';
import * as ExpressionPass from 'paas-expression-calculation';

export const initExpressionConfig = () => {
    // const interpreter = new Sval({
    //     ecmaVer: '6',
    //     sandBox: false,
    // });
    // interpreter.import(Expression.funcMap);
    // interpreter.import({
    //     SHA1: function () {
    //         return sha256(Date.now()).substring(0, 40);
    //     },
    // });
    console.log('Expression', Expression, 'ExpressionPass', ExpressionPass, 'sha256', sha256)
}