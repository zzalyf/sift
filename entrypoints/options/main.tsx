import { Component } from "solid-js";
import "../../assets/tailwind.css";
import ConfigPage from "./pages/config";

const App: Component = () => <ConfigPage />;

render(() => <App />, document.getElementById("app")!);
