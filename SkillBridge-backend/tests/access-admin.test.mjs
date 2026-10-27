import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const base = process.env.TEST_API_URL || "http://127.0.0.1:8080/api";
async function api(path, body, token, expected=200, method) {
  const response = await fetch(base + path, {method:method || (body ? "POST" : "GET"), headers:{"Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify({path,data}));
  return data;
}
const password = "SkillBridge!2026";
const login = (email, role) => api("/auth/login", {email,password,role});
async function fresh(name) {
  const email = `access-${crypto.randomUUID()}@example.test`;
  const registered = await api("/auth/register", {name,email,password});
  await api("/auth/verify", {token:registered.developmentVerificationToken});
  return {email, token:(await login(email,"LEARNER")).token};
}
test("Separate role access and database admin management", async t => {
  const admin = (await login("admin@skillbridge.local","ADMIN")).token;
  await t.test("catalog metadata, availability, and each mentor account come from the database", async () => {
    const mentors=await api("/catalog/mentors");
    for (const id of [1,2,3,4]) {
      const profile=mentors.find(m=>m.id===id);
      assert.ok(profile.profession && profile.company && profile.image);
      assert.equal(typeof profile.available,"boolean");
    }
    assert.equal(mentors.find(m=>m.id===4).available,false);
    const options=await api("/catalog/options");
    assert.ok(options.skills.includes("React"));
    assert.ok(options.categories.includes("Development"));
    for (const email of ["alex@skillbridge.local","maya@skillbridge.local","james@skillbridge.local"]) {
      const session=await login(email,"MENTOR");
      assert.equal((await api("/workspace",undefined,session.token)).email,email);
      await api("/auth/logout",{},session.token);
    }
  });
  await t.test("each portal accepts its matching account and rejects other roles", async () => {
    for (const [email,role] of [["learner@skillbridge.local","LEARNER"],["mentor@skillbridge.local","MENTOR"],["admin@skillbridge.local","ADMIN"]]) {
      const {token} = await login(email,role);
      assert.equal((await api("/auth/session",undefined,token)).role,role);
      for (const wrong of ["LEARNER","MENTOR","ADMIN"].filter(r => r !== role)) await api("/auth/login",{email,password,role:wrong},undefined,403);
      await api("/auth/logout",{},token);
      await api("/auth/session",undefined,token,401);
    }
    await api("/auth/session",undefined,undefined,401);
  });
  await t.test("learner cannot reach any admin management endpoint", async () => {
    const user = await fresh("Boundary Learner");
    for (const path of ["users","mentors","applications","content","bookings","reports","audit"]) await api(`/admin/${path}`,undefined,user.token,403);
  });
  await t.test("member edits persist and changing a role revokes active sessions", async () => {
    const user = await fresh("Editable Learner");
    const [record] = await api(`/admin/users?q=${encodeURIComponent(user.email)}`,undefined,admin);
    await api(`/admin/users/${record.id}`,{name:"Updated Learner",role:"MENTOR",enabled:true},admin,200,"PATCH");
    await api("/workspace",undefined,user.token,401);
    await api("/auth/login",{email:user.email,password,role:"LEARNER"},undefined,403);
    const next = (await login(user.email,"MENTOR")).token;
    assert.equal((await api("/workspace",undefined,next)).name,"Updated Learner");
    await api(`/admin/users/${record.id}`,{enabled:false},admin,200,"PATCH");
    await api("/auth/session",undefined,next,401);
    await api("/auth/login",{email:user.email,password,role:"MENTOR"},undefined,401);
    const self=await api("/auth/session",undefined,admin);
    await api(`/admin/users/${self.id}`,{role:"LEARNER"},admin,400,"PATCH");
  });
  await t.test("all pending applications can be reviewed independently", async () => {
    const first=await fresh("First Applicant"), second=await fresh("Second Applicant");
    for (const user of [first,second]) await api("/mentor/application",{name:user===first?"First Applicant":"Second Applicant",expertise:"React",experience:"I have five years of practical teaching and mentoring experience.",documents:"https://example.test/cv.pdf"},user.token);
    const rows=await api("/admin/applications",undefined,admin);
    const one=rows.find(r => r.email===first.email), two=rows.find(r => r.email===second.email);
    assert.ok(one && two);
    await api("/admin/applications/decision",{applicationId:one.id,status:"Approved",decision:"Strong relevant teaching experience confirmed."},admin);
    const updated=await api("/admin/applications",undefined,admin);
    assert.equal(updated.find(r=>r.id===one.id).status,"Approved");
    assert.equal(updated.find(r=>r.id===two.id).status,"Pending");
    const profiles=await api("/admin/mentors",undefined,admin);
    const profile=profiles.find(m => m.user_id===one.user_id);
    assert.ok(profile);
    const slot=new Date(Date.now()+12*86400000).toISOString();
    const edit={...profile, expertise:"React, JavaScript", bio:"An experienced mentor helping learners build useful projects.",price:65,language:"English",approved:true,slots:[slot]};
    await api(`/admin/mentors/${profile.id}`,edit,admin,200,"PATCH");
    const publicProfile=(await api("/catalog/mentors")).find(m=>m.id===profile.id);
    assert.equal(Number(publicProfile.price),65);
    assert.deepEqual((await api(`/catalog/mentors/${profile.id}/slots`)).map(s=>Date.parse(s)),[Date.parse(slot)]);
    await api(`/admin/mentors/${profile.id}`,{...edit,approved:false},admin,200,"PATCH");
    assert.equal((await api("/catalog/mentors")).some(m=>m.id===profile.id),false);
    await api(`/admin/mentors/${profile.id}`,{...edit,price:-1},admin,400,"PATCH");
  });
  await t.test("content creation, editing, publication and archiving persist in catalog", async () => {
    const title=`Access course ${crypto.randomUUID()}`;
    const data={title,category:"Development",level:"Beginner",hours:2,skills:["React"],instructor:"Test Instructor",lessons:["First lesson"],color:"rose",art:"code",rating:"New"};
    const draft=await api("/admin/content",{type:"Course",title,description:"A test course description.",data},admin);
    let records=await api("/admin/content",undefined,admin);
    const record=records.find(c=>c.id===draft.id);
    const stored=typeof record.data==="string"?JSON.parse(record.data):record.data;
    assert.equal(stored.id,draft.id);
    await api(`/admin/content/${draft.id}`,{title:`${title} edited`,status:"Published",data:{...stored,title:"Ignored stale title"}},admin,200,"PATCH");
    const catalog=await api(`/catalog/courses?q=${encodeURIComponent(title)}`);
    assert.equal(catalog.items[0].title,`${title} edited`);
    await api(`/admin/content/${draft.id}`,{status:"Archived"},admin,200,"PATCH");
    assert.equal((await api(`/catalog/courses?q=${encodeURIComponent(title)}`)).total,0);
    await api(`/admin/content/${draft.id}`,{status:"Published",data:{skills:"invalid"}},admin,400,"PATCH");
  });
  await t.test("administrative changes appear in the audit log and logout revokes token", async () => {
    const audit=await api("/admin/audit",undefined,admin);
    for (const action of ["user.update","mentor.review","mentor.update","content.create","content.update"]) assert.ok(audit.some(e=>e.action===action),action);
    await api("/auth/logout",{},admin);
    await api("/admin/users",undefined,admin,401);
  });
});
