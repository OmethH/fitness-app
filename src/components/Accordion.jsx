import { useState } from "react";

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          cursor: "pointer",
          background: "#f0f0f0",
          padding: 10,
          borderRadius: 5,
        }}
        onClick={() => setOpen(!open)}
      >
        <strong>{title}</strong> {open ? "▲" : "▼"}
      </div>
      {open && <div style={{ padding: 10 }}>{children}</div>}
    </div>
  );
}

export default Accordion;