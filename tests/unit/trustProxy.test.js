const express = require("express");
const request = require("supertest");
const { parseTrustProxy } = require("../../src/utils/trustProxy");

describe("parseTrustProxy (TRUST_PROXY)", () => {
  it("reads a whole number of proxies", () => {
    expect(parseTrustProxy("0")).toBe(0);
    expect(parseTrustProxy("2")).toBe(2);
    expect(parseTrustProxy(" 2 ")).toBe(2);
  });

  it("uses 1 when it is missing or wrong", () => {
    for (const value of [undefined, null, "", "abc", "-1", "1.5", "true", "11"]) {
      expect(parseTrustProxy(value)).toBe(1);
    }
  });
});

// The same X-Forwarded-For that Render sends: "<header from the client>, <client>, <Cloudflare>"
describe("req.ip behind Cloudflare + Render (2 proxies)", () => {
  const ipWith = (hops, forwardedFor) => {
    const app = express();
    app.set("trust proxy", hops);
    app.get("/ip", (req, res) => res.json({ ip: req.ip }));
    return request(app).get("/ip").set("X-Forwarded-For", forwardedFor);
  };

  it("2 gives the real client IP, and a fake header can't change it", async () => {
    const normal = await ipWith(2, "198.51.100.20, 172.68.1.1");
    expect(normal.body.ip).toBe("198.51.100.20");

    const faked = await ipWith(2, "6.6.6.6, 198.51.100.20, 172.68.1.1");
    expect(faked.body.ip).toBe("198.51.100.20");
  });

  it("1 gives the Cloudflare IP (the old problem)", async () => {
    const res = await ipWith(1, "198.51.100.20, 172.68.1.1");
    expect(res.body.ip).toBe("172.68.1.1");
  });
});
