import type { Types } from "mongoose";

type OrderOverrides = {
  purchaseDetails?: {
    fullName?: string;
    countryCode?: string;
    phoneNumber?: string;
    region?: string;
  };
  quantity?: number;
  totalPrice?: number;
};

const createTestOrder = (
  itemId: Types.ObjectId | string,
  overrides: OrderOverrides = {},
) => ({
  purchaseDetails: {
    fullName: "أحمد محمد",
    countryCode: "+970",
    phoneNumber: "059123456",
    region: "hebron",
    ...overrides.purchaseDetails,
  },

  itemId,
  quantity: 2,

  totalPrice: 100,

  ...overrides,
});

export default { createTestOrder };
