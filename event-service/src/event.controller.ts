import { Request, Response } from 'express';
import { Event } from './event.model.js';
import { logger } from './logger.js';

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const { type, serviceName } = req.query;
    logger.debug({ type, serviceName }, 'Fetching all events');

    const filter: Record<string, string> = {};
    if (type) filter.type = type as string;
    if (serviceName) filter.serviceName = serviceName as string;

    const events = await Event.find(filter).sort({ createdAt: -1 });

    logger.debug('Events fetched successfully');
    res.status(200).json({ events });
  } catch (error) {
    logger.error(error, 'Error fetching events');
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    logger.debug({ body: req.body }, 'Creating event');
    const { type, serviceName, sourceId, data } = req.body;

    if (!type || !serviceName || !sourceId || !data) {
      res.status(400).json({
        error: 'type, serviceName, sourceId, and data are required',
      });
      return;
    }

    const event = await Event.create({ type, serviceName, sourceId, data });

    logger.debug('Event created successfully');
    res.status(201).json({ event });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      logger.warn(error, 'Error creating event: ValidationError');
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error(error, 'Error creating event');
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    logger.debug({ id }, 'Fetching event by id');

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    logger.debug('Event fetched successfully');
    res.status(200).json({ event });
  } catch (error) {
    logger.error(error, 'Error fetching event');
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};
