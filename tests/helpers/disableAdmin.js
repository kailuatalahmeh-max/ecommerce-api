const Admin = require("../../src/models/Admin").default

const disableAdmin = async (adminId) => {
  await Admin.updateOne({ _id: adminId }, { isActive: false });
};
module.exports = { disableAdmin };
