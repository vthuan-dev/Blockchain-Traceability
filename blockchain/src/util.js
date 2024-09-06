function convertBigIntToString(item) {
    if (typeof item === 'bigint') {
      return item.toString();
    }
    if (Array.isArray(item)) {
      return item.map(convertBigIntToString);
    }
    if (typeof item === 'object' && item !== null) {
      return Object.fromEntries(
        Object.entries(item).map(([key, value]) => [key, convertBigIntToString(value)])
      );
    }
    return item;
  }
  
  module.exports = { convertBigIntToString };