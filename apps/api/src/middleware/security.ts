import helmet from "helmet";

/**
 * Security headers middleware using Helmet.
 * Configures CSP to allow the web app to function while preventing XSS.
 */
export const securityMiddleware = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:"],
			connectSrc: ["'self'", "ws:", "wss:"],
			fontSrc: ["'self'"],
			objectSrc: ["'none'"],
			frameAncestors: ["'none'"],
			baseUri: ["'self'"],
			formAction: ["'self'"],
		},
	},
	crossOriginEmbedderPolicy: false,
	hsts: {
		maxAge: 31536000,
		includeSubDomains: true,
		preload: true,
	},
});
