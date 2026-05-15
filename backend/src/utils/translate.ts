import axios from 'axios';

// MyMemory free translation API — key gerektirmez, 1000 kelime/gün
export async function translateToTurkish(text: string): Promise<string> {
  if (!text) return text;
  try {
    const res = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text.slice(0, 500), langpair: 'en|tr' },
      timeout: 4000,
    });
    if (res.data?.responseStatus === 200) {
      return res.data.responseData.translatedText as string;
    }
    return text;
  } catch {
    return text;
  }
}
