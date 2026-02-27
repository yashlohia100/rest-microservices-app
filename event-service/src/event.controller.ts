import { Request, Response } from 'express';
import { Event } from './event.model.js';

export const EVENT_TYPES = {
  POST_CREATED: 'postCreated',
  POST_UPDATED: 'postUpdated',
  POST_DELETED: 'postDeleted',
  USER_CREATED: 'userCreated',
  USER_UPDATED: 'userUpdated',
  USER_DELETED: 'userDeleted',
} as const;

export const EVENT_SERVICE_NAMES = {
  POST_SERVICE: 'postService',
  USER_SERVICE: 'userService',
} as const;

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find();
    res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { type, serviceName, data } = req.body;
    const event = await Event.create({ type, serviceName, data });
    res.status(201).json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    res.status(200).json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};
