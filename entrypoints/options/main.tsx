import { Component } from "solid-js";
import "../../assets/tailwind.css";
import ConfigPage from "./pages/config";
import { Toast } from "../../components/Toast";

const App: Component = () => (
  <>
    <ConfigPage />
    <Toast />
  </>
);

render(() => <App />, document.getElementById("app")!);
