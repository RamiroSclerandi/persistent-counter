'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

/* Obtain the current counter, and if more than 20 minutes have passed since the last change,
 it resets it to 0 automatically before returning it. This ensures the counter does not grow indefinitely
 and is reset after a period of inactivity. */
export async function getCounter() {
  // Finds the first counter record
  let counter = await prisma.counter.findFirst();
  const now = new Date();

  // If it doesn't exist, create the initial record

  if (!counter) {
    counter = await prisma.counter.create({
      data: { value: 0, last_updated: now },
    });
    return counter;
  }

  // Calculate the time difference in minutes
  const lastUpdated = new Date(counter.last_updated);
  const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

  // If more than 20 minutes have passed since the last change and the value is not 0, reset it
  if (diffMinutes > 20 && counter.value !== 0) {
    counter = await prisma.counter.update({
      where: { id: counter.id },
      data: { value: 0, last_updated: now },
    });
  }

  return counter;
}

/* Increment and decrement functions for the counter.
 These functions update the counter value and the last updated timestamp in the database. */
export async function incrementCounter() {
  // Get the current counter
  const counter = await getCounter();

  // Increment the value and update the last updated timestamp
  const updated = await prisma.counter.update({
    where: { id: counter.id },
    data: { value: counter.value + 1, last_updated: new Date() },
  });

  revalidatePath('/');
  return updated;
}

/* Decrements the counter value and updates the last updated timestamp. */
export async function decrementCounter() {
  // Get the current counter
  const counter = await getCounter();

  // If the counter is already at 0, do not decrement further.
  if (counter.value <= 0) {
    return counter; // Return the current state without changes.
  }

  // Decrement the value and update the last updated timestamp
  const updated = await prisma.counter.update({
    where: { id: counter.id },
    data: { value: counter.value - 1, last_updated: new Date() },
  });

  revalidatePath('/');
  return updated;
}