import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "../server/db";
import {
  app,
  auth,
  createUser,
  loginAs,
  TEST_PASSWORD,
  V1,
} from "./helpers";

describe("authentication (FR-AUTH-01/02)", () => {
  it("issues a session token for valid credentials", async () => {
    const user = await createUser("admin", { email: "admin@test.dev" });
    const response = await request(app)
      .post(`${V1}/login`)
      .send({ email: "admin@test.dev", password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.user).toMatchObject({
      id: Number(user.id),
      email: "admin@test.dev",
      role: "admin",
    });
  });

  it("accepts mixed-case email with surrounding whitespace", async () => {
    await createUser("viewer", { email: "case@test.dev" });
    const response = await request(app)
      .post(`${V1}/login`)
      .send({ email: "  Case@Test.Dev ", password: TEST_PASSWORD });
    expect(response.status).toBe(200);
  });

  it("returns 401 with the generic message for a wrong password", async () => {
    await createUser("viewer", { email: "wrongpass@test.dev" });
    const response = await request(app)
      .post(`${V1}/login`)
      .send({ email: "wrongpass@test.dev", password: "not-the-password" });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password.");
  });

  it("returns 401 for an unknown email (no user enumeration)", async () => {
    const response = await request(app)
      .post(`${V1}/login`)
      .send({ email: "ghost@test.dev", password: TEST_PASSWORD });
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password.");
  });

  it("returns 401 for a deactivated account", async () => {
    await createUser("viewer", { email: "inactive@test.dev", isActive: false });
    const response = await request(app)
      .post(`${V1}/login`)
      .send({ email: "inactive@test.dev", password: TEST_PASSWORD });
    expect(response.status).toBe(401);
  });

  it("records lastLoginAt on every successful login", async () => {
    const user = await createUser("viewer", { email: "stamp@test.dev" });
    expect(user.lastLoginAt).toBeNull();

    await request(app)
      .post(`${V1}/login`)
      .send({ email: "stamp@test.dev", password: TEST_PASSWORD })
      .expect(200);

    const reloaded = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(reloaded.lastLoginAt).not.toBeNull();
  });
});

describe("session handling and per-user access (PRD §6, §9.2)", () => {
  it("rejects requests without a token", async () => {
    const response = await request(app).get(
      `${V1}/dashboard/summary?start=2026-01-01&end=2026-01-07`,
    );
    expect(response.status).toBe(401);
  });

  it("rejects malformed and tampered tokens", async () => {
    const { token } = await loginAs("viewer");
    const malformed = await request(app)
      .get(`${V1}/me`)
      .set(auth("not-a-real-jwt"));
    expect(malformed.status).toBe(401);

    const tampered = await request(app).get(`${V1}/me`).set(auth(`${token}x`));
    expect(tampered.status).toBe(401);
  });

  it("restores the session with GET /me", async () => {
    const { user, token } = await loginAs("admin");
    const response = await request(app).get(`${V1}/me`).set(auth(token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: Number(user.id),
      role: "admin",
    });
  });

  it("invalidates the session when the account is deactivated mid-session", async () => {
    const { user, token } = await loginAs("viewer");
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const response = await request(app).get(`${V1}/me`).set(auth(token));
    expect(response.status).toBe(401);
  });

  it("returns 204 for logout", async () => {
    const { token } = await loginAs("viewer");
    const response = await request(app).post(`${V1}/logout`).set(auth(token));
    expect(response.status).toBe(204);
  });

  it("blocks viewers from every admin-only endpoint", async () => {
    const { token } = await loginAs("viewer");
    const headers = auth(token);

    const responses = await Promise.all([
      request(app).get(`${V1}/users`).set(headers),
      request(app)
        .post(`${V1}/users`)
        .set(headers)
        .send({
          name: "Nope",
          email: "nope@example.com",
          role: "viewer",
          password: "password123",
        }),
      request(app).post(`${V1}/branches`).set(headers).send({ name: "Nope" }),
      request(app)
        .patch(`${V1}/branches/1`)
        .set(headers)
        .send({ isActive: false }),
      request(app)
        .post(`${V1}/product-categories`)
        .set(headers)
        .send({ name: "Nope" }),
      request(app)
        .patch(`${V1}/product-categories/1`)
        .set(headers)
        .send({ isActive: false }),
      request(app).get(`${V1}/admin/sync-status`).set(headers),
      request(app).get(`${V1}/admin/sync-runs`).set(headers),
      request(app).post(`${V1}/admin/sync-trigger`).set(headers),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
    }
  });
});

describe("user management (ACT-09)", () => {
  it("lets an admin create a user and never returns the password hash", async () => {
    const { token } = await loginAs("admin");
    const response = await request(app)
      .post(`${V1}/users`)
      .set(auth(token))
      .send({
        name: "New Viewer",
        email: "NEW.Viewer@Example.com",
        role: "viewer",
        password: "newpassword1",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "New Viewer",
      email: "new.viewer@example.com",
      role: "viewer",
      isActive: true,
      lastLoginAt: null,
    });
    expect(response.body).not.toHaveProperty("passwordHash");

    const list = await request(app).get(`${V1}/users`).set(auth(token));
    expect(list.body).toHaveLength(2);
  });

  it("rejects a duplicate email with 409", async () => {
    const { token } = await loginAs("admin");
    await request(app)
      .post(`${V1}/users`)
      .set(auth(token))
      .send({
        name: "First",
        email: "dup@example.com",
        role: "viewer",
        password: "password123",
      })
      .expect(201);

    const duplicate = await request(app)
      .post(`${V1}/users`)
      .set(auth(token))
      .send({
        name: "Second",
        email: "DUP@example.com",
        role: "viewer",
        password: "password123",
      });
    expect(duplicate.status).toBe(409);
  });

  it("validates weak passwords and malformed emails with 400", async () => {
    const { token } = await loginAs("admin");
    const weak = await request(app)
      .post(`${V1}/users`)
      .set(auth(token))
      .send({
        name: "Weak",
        email: "weak@example.com",
        role: "viewer",
        password: "short",
      });
    expect(weak.status).toBe(400);

    const badEmail = await request(app)
      .post(`${V1}/users`)
      .set(auth(token))
      .send({
        name: "Bad Email",
        email: "not-an-email",
        role: "viewer",
        password: "password123",
      });
    expect(badEmail.status).toBe(400);
  });
});
