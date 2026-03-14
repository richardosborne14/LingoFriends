/**
 * GET /api/health
 *
 * Health check endpoint used by nginx, Docker HEALTHCHECK, and load balancers.
 * Returns 200 with a timestamp if the server is running correctly.
 *
 * No auth required — this endpoint is intentionally public.
 * Does NOT test DB connectivity (that would add latency to health probes).
 *
 * @module routes/api/health
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		service: 'lingofriends',
		timestamp: new Date().toISOString(),
	});
};
