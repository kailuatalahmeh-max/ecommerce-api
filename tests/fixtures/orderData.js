const createTestOrder = (itemId, overrides = {}) => ({
  purchaseDetails: {
    fullName: "أحمد محمد",
    countryCode: "+970",
    phoneNumber: "0599123456",
    region: "hebron",
    ...overrides.purchaseDetails,
  },

  itemId,
  quantity: 2,

  totalPrice: 100,

  ...overrides,
});

module.exports = { createTestOrder };
