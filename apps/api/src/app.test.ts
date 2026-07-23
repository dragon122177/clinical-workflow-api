import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

let app:any,token:string;
beforeAll(async()=>{app=await createApp();const login=await request(app).post("/api/auth/login").send({email:"admin@careflow.demo",password:"demo1234"});token=login.body.token});
describe("CareFlow API",()=>{
  it("reports health",async()=>{const r=await request(app).get("/api/health");expect(r.status).toBe(200);expect(r.body.status).toBe("ok")});
  it("rejects protected routes without a token",async()=>{expect((await request(app).get("/api/patients")).status).toBe(401)});
  it("returns dashboard metrics",async()=>{const r=await request(app).get("/api/dashboard").set("Authorization",`Bearer ${token}`);expect(r.status).toBe(200);expect(r.body.patients).toBeGreaterThanOrEqual(3)});
  it("creates and searches a patient",async()=>{const created=await request(app).post("/api/patients").set("Authorization",`Bearer ${token}`).send({firstName:"Jordan",lastName:"Taylor",dateOfBirth:"1992-05-12",email:"jordan@example.test",riskLevel:"LOW"});expect(created.status).toBe(201);const list=await request(app).get("/api/patients?q=Jordan").set("Authorization",`Bearer ${token}`);expect(list.body.some((p:any)=>p.first_name==="Jordan")).toBe(true)});
  it("detects optimistic concurrency conflicts",async()=>{const list=await request(app).get("/api/patients").set("Authorization",`Bearer ${token}`);const p=list.body[0];const first=await request(app).patch(`/api/patients/${p.id}`).set("Authorization",`Bearer ${token}`).send({riskLevel:"MEDIUM",expectedVersion:p.version});expect(first.status).toBe(200);const stale=await request(app).patch(`/api/patients/${p.id}`).set("Authorization",`Bearer ${token}`).send({riskLevel:"HIGH",expectedVersion:p.version});expect(stale.status).toBe(409)});
});
