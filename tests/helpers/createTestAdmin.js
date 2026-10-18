const jwt = require("jsonwebtoken");
const Admin = require("../../src/models/Admin");

const createTestAdmin = async (role = "admin") => {
  const admin = await Admin.create({
    fullName: "Test Admin User",
    email: `${role}-${Date.now()}@test.com`,
    password: "not-a-real-hash",
    role,
  });

  const token = jwt.sign(
    { role: admin.role, id: admin._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return { admin, token };
};

module.exports = { createTestAdmin };
