import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { router } from "./lib/router.js";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element not found");

const queryClient = new QueryClient();

ReactDOM.createRoot(rootEl).render(
	<QueryClientProvider client={queryClient}>
		<RouterProvider router={router} />
	</QueryClientProvider>,
);
