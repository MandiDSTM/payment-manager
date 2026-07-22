const normalizeText = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
};

module.exports = normalizeText;
