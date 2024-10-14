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

  function getFullAvatarUrl(avatarPath) {
    if (!avatarPath) return '/path/to/default/avatar.png';
    return `https://storage.googleapis.com/nckh-60471.appspot.com/${avatarPath}`;
}
  
  module.exports = { convertBigIntToString, getFullAvatarUrl };
