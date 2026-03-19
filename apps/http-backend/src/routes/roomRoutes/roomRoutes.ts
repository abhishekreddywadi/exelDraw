/**
 * Room Routes
 * Routes for room-related operations
 */

import express, { Router } from 'express';
import { createRoom } from '../../controllers/roomController/roomController';
import { getRoomChats } from '../../controllers/roomController/getRoomChats';
import { getRoomDrawings } from '../../controllers/roomController/getRoomDrawings';

const router: Router = express.Router();

/**
 * POST /rooms/create-room
 * Create a new chat room
 * Requires authentication
 */
router.post('/create-room', createRoom);

/**
 * GET /rooms/:slug/chats
 * Get all chat messages for a room by slug
 * Requires authentication
 */
router.get('/:slug/chats', getRoomChats);

/**
 * GET /rooms/:slug/drawings
 * Get all drawings for a room by slug
 * Requires authentication
 */
router.get('/:slug/drawings', getRoomDrawings);

export default router;
