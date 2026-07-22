const normalizeSheba = (sheba) => {
    const cleaned = String(sheba || '').replace(/\s/g, '').toUpperCase();
    if (!cleaned) return '';
    return cleaned.startsWith('IR') ? cleaned : `IR${cleaned}`;
};

const isValidSheba = (sheba) => /^IR\d{24}$/.test(normalizeSheba(sheba));

module.exports = { normalizeSheba, isValidSheba };
