import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateChatId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

export async function shareLink(url: string, title?: string, text?: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || 'Secure Chat Link',
        text: text || 'Join me for a secure, encrypted conversation',
        url: url
      });
      return true;
    } catch (err) {
      return false;
    }
  }
  return false;
}
