import { Router } from 'express';
import { createEvent, getAllEvents, getEventById } from './event.controller.js';

const eventRouter = Router();

eventRouter.get('/', getAllEvents);
eventRouter.post('/', createEvent);

eventRouter.get('/:id', getEventById);

export { eventRouter };
