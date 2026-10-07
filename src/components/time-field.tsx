"use client";

import { useState } from "react";

export function TimeField({ name = "time", id, defaultValue = "" }: { name?: string; id: string; defaultValue?: string }) {
  const [hour, setHour] = useState(defaultValue.slice(0, 2));
  const [minute, setMinute] = useState(defaultValue.slice(3, 5) === "30" ? "30" : "00");
  return <div className="time-field"><select id={id} className="input" aria-label="Hora da aula" required value={hour} onChange={(event) => setHour(event.target.value)}><option value="">Hora</option>{Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")).map((value) => <option key={value} value={value}>{value}</option>)}</select><span aria-hidden="true">:</span><select className="input" aria-label="Minutos da aula" value={minute} onChange={(event) => setMinute(event.target.value)}><option value="00">00</option><option value="30">30</option></select><input type="hidden" name={name} value={hour ? `${hour}:${minute}` : ""} /></div>;
}
