const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COUNTRY_CODES = [
  { value: "+970", label: "Palestine" },
  { value: "+972", label: "Israel" },
];

const ALLOWED_ROLES = ["admin", "moderator", "super_admin"];

module.exports = {
  UUID_V4_REGEX,
  COUNTRY_CODES,
  ALLOWED_ROLES,
};
