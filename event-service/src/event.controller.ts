import { Request, Response } from 'express';
import { Event } from './event.model.js';

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const { type, serviceName } = req.query;

    const filter: Record<string, string> = {};
    if (type) filter.type = type as string;
    if (serviceName) filter.serviceName = serviceName as string;

    const events = await Event.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { type, serviceName, sourceId, data } = req.body;

    if (!type || !serviceName || !sourceId || !data) {
      res.status(400).json({
        error: 'type, serviceName, sourceId, and data are required',
      });
      return;
    }

    const event = await Event.create({ type, serviceName, sourceId, data });
    res.status(201).json({ event });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(200).json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};
