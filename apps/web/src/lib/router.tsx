import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import FlowBuilder from "../components/FlowBuilder.js";
import FlowList from "../components/FlowList.js";
import Root from "../components/Root.js";

const rootRoute = createRootRoute({
	component: Root,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: () => <FlowList />,
});

const flowRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/flows/$flowId",
	component: () => <FlowBuilder />,
});

export const routeTree = rootRoute.addChildren([indexRoute, flowRoute]);

export const router = createRouter({
	routeTree,
});

export type Router = typeof router;
