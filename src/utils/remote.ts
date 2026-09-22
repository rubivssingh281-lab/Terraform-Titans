/**
 * Dispatches a POST request to the Echolytix server to send an input event
 * from the mobile device to the paired laptop receiver.
 */
export const sendRemoteEvent = async (
  code: string | undefined,
  type: 'morse' | 'char' | 'word' | 'phrase' | 'clear' | 'backspace' | 'beep' | 'speak' | 'sos' | 'connected',
  value: any
): Promise<void> => {
  if (!code) return;
  try {
    const res = await fetch('/api/remote/session/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, type, value }),
    });
    if (!res.ok) {
      console.warn(`Remote event sending failed: ${res.statusText}`);
    }
  } catch (err) {
    console.warn('Failed to send remote event:', err);
  }
};
