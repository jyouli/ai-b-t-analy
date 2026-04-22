import BigNumber from 'bignumber.js';

const toFixedByRounding = (value, decimal = 0) => {
    const mathPow = BigNumber(10).exponentiatedBy(decimal).toNumber();

    // 不考虑js精度问题的情况下，与表达式(Math.round(+(value || 0) * Math.pow(10, decimal)) / Math.pow(10, decimal)).toFixed(decimal);相同
    return BigNumber(value || 0)
        .multipliedBy(mathPow)
        .integerValue()
        .dividedBy(mathPow)
        .toFixed(decimal);
}

Number.prototype.toFixedByRounding = function(decimal) {
    return toFixedByRounding(this, decimal);
}