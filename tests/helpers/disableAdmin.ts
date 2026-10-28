import Admin from "../../src/models/Admin";

const disableAdmin = async (adminId) => {
  await Admin.updateOne({ _id: adminId }, { isActive: false });
};
export default { disableAdmin };
