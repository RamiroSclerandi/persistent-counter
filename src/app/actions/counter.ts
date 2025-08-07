'use server';

import { prisma } from '../../lib/prisma';
import { setResetKey } from '../../lib/resetKeys';
import { revalidatePath } from 'next/cache';

/* Obtain the current counter, and if more than 20 minutes have passed since the last change,
 it resets it to 0 automatically before returning it. This ensures the counter does not grow indefinitely
 and is reset after a period of inactivity. */

export async function getCounter() {
  // Finds the first counter record
  let counter = await prisma.counter.findFirst();
  const now = new Date();

  // If it doesn't exist, create the initial record
  counter ??= await prisma.counter.create({
    data: { value: 0, last_updated: now },
  });

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
  console.log("Counter incremented:", updated.value);

  // Set a Redis key to indicate the counter has been reset due to inactivity
  await setResetKey();

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
  console.log("Counter decremented:", updated.value);

  // Set a Redis key to indicate the counter has been reset due to inactivity
  await setResetKey();

  revalidatePath('/');
  return updated;
}

/* Resets the counter value to 0 and updates the last updated timestamp.
 If the counter is already at 0, it does nothing. */

export async function updateCounterToZero() {
  // Get the current counter
  const counter = await getCounter();

  // If the counter is already 0, do nothing
  if (counter.value === 0) {
    return counter;
  }

  // Update the counter to 0
  const updated = await prisma.counter.update({
    where: { id: counter.id },
    data: { value: 0, last_updated: new Date() },
  });
  console.log("Counter reset to zero");

  revalidatePath('/');
  return updated;
}
