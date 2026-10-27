import { useState } from "react";

export function AvailabilityFields({initial, separator="\n"}: {initial: string[]; separator?: string}) {
  const [slots, setSlots] = useState(initial.filter(s => Date.parse(s) > Date.now()));
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  function add() {
    const time = new Date(next);
    if (!next || !Number.isFinite(time.getTime()) || time.getTime() <= Date.now()) { setError("Choose a future date and time."); return; }
    const value = time.toISOString();
    if (slots.some(s => Date.parse(s) === time.getTime())) { setError("This time is already on your list."); return; }
    setSlots([...slots, value].sort()); setNext(""); setError("");
  }
  return <fieldset className="availability-fields"><legend>Available times</legend>
    <p>Choose dates in your local time. Each session lasts 45 minutes.</p>
    <div className="availability-add"><label>Date and time<input type="datetime-local" value={next} onChange={e => setNext(e.target.value)}/></label><button className="outline" type="button" onClick={add}>Add time</button></div>
    {error && <p role="alert">{error}</p>}
    {slots.map(value => <div className="review-row" key={value}><span>{new Date(value).toLocaleString(undefined, {dateStyle:"medium",timeStyle:"short"})}</span><button className="text-button" type="button" onClick={() => setSlots(slots.filter(s => s !== value))} aria-label={`Remove ${new Date(value).toLocaleString()}`}>Remove</button></div>)}
    {!slots.length && <p>No times added yet.</p>}
    <input type="hidden" name="slots" value={slots.join(separator)}/>
  </fieldset>;
}
