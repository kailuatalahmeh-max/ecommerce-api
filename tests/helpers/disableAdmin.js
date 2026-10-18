const Admin = require("../../src/models/Admin");

const disableAdmin = async (adminId) => {
  await Admin.updateOne({ _id: adminId }, { isActive: false });
};
module.exports = { disableAdmin };
