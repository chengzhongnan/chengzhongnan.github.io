export function getRandomIntegers(length, k) {
    if (k > length) {
        throw new Error('k cannot be greater than length');
    }

    // 创建一个数组包含 0 到 length-1 的整数
    const array = Array.from({ length }, (_, index) => index);

    // Fisher-Yates 洗牌算法
    for (let i = length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // 交换
    }

    // 取前 k 个数作为结果
    return array.slice(0, k);
}