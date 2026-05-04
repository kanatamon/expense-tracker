import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div>
      <h1>Expense Tracker</h1>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
