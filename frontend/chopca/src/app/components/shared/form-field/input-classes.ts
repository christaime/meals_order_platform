/**
 * Canonical Tailwind classes for any form input inside Chop ça!
 *
 * Centralizes the visual contract for text/email/password/tel inputs
 * so every form in the app looks consistent without repeating utility
 * classes.
 *
 * Usage (in a parent template):
 *   <input [class]="INPUT_CLASSES" [formControl]="emailControl" />
 */
export const INPUT_CLASSES =
  'w-full bg-transparent text-on-surface font-body text-sm ' +
  'placeholder:text-on-surface-variant/50 ' +
  'border-0 outline-none focus:outline-none focus:ring-0 ' +
  'py-3 px-4 rounded-lg';
