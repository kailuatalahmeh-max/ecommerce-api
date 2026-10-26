import jwt from "jsonwebtoken";
import Admin, { IAdmin } from "../../src/models/Admin";
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set");

const createTestAdmin = async (role: IAdmin["role"] = "admin") => {
  const admin = await Admin.create({
    fullName: "Test Admin User",
    email: `${role}-${Date.now()}@test.com`,
    password: "not-a-real-hash",
    role,
  });

  const token = jwt.sign({ role: admin.role, id: admin._id }, secret, {
    expiresIn: "1h",
  });

  return { admin, token };
};

export default { createTestAdmin };
