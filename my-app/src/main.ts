import "./style.css";
import { mountApp } from "./app/App.ts";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("#app element not found");
}
mountApp(root);
