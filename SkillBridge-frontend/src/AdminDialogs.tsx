import { useState } from "react";
import { AvailabilityFields } from "./AvailabilityFields";

type Content = { id: number; title: string; kind: string; status: string; data: Record<string, unknown> };
type User = {id: number; name: string; email: string; role: string; enabled: boolean};
type Mentor = {id: number; name: string; expertise: string; bio: string; price: number; approved: boolean; language: string; slots: string[]};
type Props = {
  modal: {type: string; id?: number}; content: Content[]; users: User[]; mentors: Mentor[];
  request: (path: string, body?: unknown, method?: string) => Promise<any>;
  onSaved: () => void; notify: (text: string) => void;
};
export function AdminDialog({modal, content, users, mentors, request, onSaved, notify}: Props) {
  const record = content.find(c => c.id === modal.id);
  const user = users.find(u => u.id === modal.id);
  const mentor = mentors.find(m => m.id === modal.id);
  const [kind, setKind] = useState(record?.kind || "Course");
  const [busy, setBusy] = useState(false);
  const data = record?.data || {};
  const list = (value: unknown) => Array.isArray(value) ? value.join("\n") : String(value || "");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) || "").trim();
    const lines = (key: string) => value(key).split("\n").map(s => s.trim()).filter(Boolean);
    setBusy(true);
    try {
      if (modal.type === "editUser" && user) {
        await request(`/admin/users/${user.id}`, {name:value("name"), role:value("role"), enabled:form.has("enabled")}, "PATCH");
      } else if (modal.type === "editMentor" && mentor) {
        await request(`/admin/mentors/${mentor.id}`, {name:value("name"), expertise:value("expertise"), bio:value("bio"), language:value("language"), price:Number(value("price")), approved:form.has("approved"), slots:lines("slots")}, "PATCH");
      } else if (modal.type === "resolveReport") {
        await request(`/admin/reports/${modal.id}`, {decision:value("decision")}, "PATCH");
      } else {
        const title = value("title"), description = value("description");
        const next = {...data, title, description,
          ...(["Course", "Project"].includes(kind) ? {
            category:value("category"), level:value("level"), hours:Number(value("hours")),
            skills:value("skills").split(",").map(s => s.trim()).filter(Boolean),
            color:data.color || "rose", art:data.art || "design", rating:data.rating || "New",
            ...(kind === "Course" ? {instructor:value("instructor"), lessons:lines("lessons")} : {brief:description}),
          } : {}),
        };
        if (record) await request(`/admin/content/${record.id}`, {title, status:value("status"), data:next}, "PATCH");
        else await request("/admin/content", {type:kind, title, description, data:next});
      }
      notify("Changes saved to the database.");
      onSaved();
    } catch (error) { notify((error as Error).message); }
    finally { setBusy(false); }
  }
  if (modal.type === "editUser" && user) return <form className="modal-content stack-form" onSubmit={save}>
    <span className="eyebrow">MEMBER MANAGEMENT</span><h2>Edit member</h2><p>{user.email}</p>
    <label>Full name<input name="name" defaultValue={user.name} required minLength={2} maxLength={80}/></label>
    <label>Role<select name="role" defaultValue={user.role}><option>LEARNER</option><option>MENTOR</option><option>ADMIN</option></select></label>
    <label className="checkbox-label"><input type="checkbox" name="enabled" defaultChecked={user.enabled}/>Account active</label>
    <p>Changing access logs the member out of their active sessions.</p>
    <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save member"}</button>
  </form>;
  if (modal.type === "editMentor" && mentor) return <form className="modal-content stack-form" onSubmit={save}>
    <span className="eyebrow">MENTOR MANAGEMENT</span><h2>Edit mentor</h2>
    <label>Name<input name="name" defaultValue={mentor.name} required minLength={2} maxLength={80}/></label>
    <label>Expertise<input name="expertise" defaultValue={mentor.expertise} required minLength={2} maxLength={500}/></label>
    <label>Bio<textarea name="bio" defaultValue={mentor.bio} required minLength={2} maxLength={3000}/></label>
    <label>Language<input name="language" defaultValue={mentor.language} required minLength={2} maxLength={80}/></label>
    <label>Session price (€)<input name="price" type="number" step="0.01" min={0} max={1000} defaultValue={mentor.price} required/></label>
    <AvailabilityFields initial={mentor.slots}/>
    <label className="checkbox-label"><input name="approved" type="checkbox" defaultChecked={mentor.approved}/>Approved and visible in directory</label>
    <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save mentor"}</button>
  </form>;
  if (modal.type === "resolveReport") return <form className="modal-content stack-form" onSubmit={save}>
    <h2>Resolve report</h2><label>Decision and action taken<textarea name="decision" required minLength={10} maxLength={2000} rows={5}/></label><button className="primary" disabled={busy}>{busy ? "Saving…" : "Resolve report"}</button>
  </form>;
  if (!["content", "editContent"].includes(modal.type)) return null;
  return <form className="modal-content stack-form" onSubmit={save}>
    <span className="eyebrow">CONTENT MANAGEMENT</span><h2>{record ? "Edit content" : "Create content"}</h2>
    <label>Content type<select value={kind} onChange={e => setKind(e.target.value)} disabled={!!record}>{["Course","Project","Lesson","Category","Skill"].map(k => <option key={k}>{k}</option>)}</select></label>
    <label>Title<input name="title" defaultValue={record?.title} required minLength={2} maxLength={150}/></label>
    <label>{kind === "Project" ? "Project brief" : "Description"}<textarea name="description" defaultValue={String(data.brief || data.description || "")} rows={4} required minLength={kind === "Project" ? 20 : 1} maxLength={10000}/></label>
    {["Course","Project"].includes(kind) && <>
      <label>Category<input name="category" defaultValue={String(data.category || "Design")} required maxLength={100}/></label>
      <label>Level<select name="level" defaultValue={String(data.level || "Beginner")}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
      <label>Duration (hours)<input name="hours" type="number" min={1} max={1000} defaultValue={Number(data.hours || 1)} required/></label>
      <label>Skills (separated by commas)<input name="skills" defaultValue={Array.isArray(data.skills) ? data.skills.join(", ") : ""} required/></label>
      {kind === "Course" && <><label>Instructor<input name="instructor" defaultValue={String(data.instructor || "")} required minLength={2} maxLength={150}/></label><label>Lessons (one title per line)<textarea name="lessons" defaultValue={list(data.lessons)} rows={5} required/></label></>}
    </>}
    {record ? <label>Status<select name="status" defaultValue={record.status}><option>Draft</option><option>Published</option><option>Archived</option></select></label> : <p>New content starts as a draft. Review it, then publish from Edit record.</p>}
    <button className="primary" disabled={busy}>{busy ? "Saving…" : record ? "Save content" : "Create draft"}</button>
  </form>;
}
