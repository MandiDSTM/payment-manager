module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'payment-manager-dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
