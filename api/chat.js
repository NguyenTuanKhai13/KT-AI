// api/chat.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { provider, text, model, fileData, fileType, fileName } = await req.json();

  // Lấy key từ biến môi trường của Vercel
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  try {
    if (provider === 'groq') {
      let userContent = text;
      if (fileData && fileType?.startsWith('image/')) {
        userContent = [
          { type: 'text', text: text || 'Mô tả hình ảnh này.' },
          { type: 'image_url', image_url: { url: fileData } }
        ];
      } else if (fileData) {
        userContent = `${text}\n\n[File: ${fileName}]\n${fileData}`;
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${GROQ_KEY}` 
        },
        body: JSON.stringify({
          model: model || "llama-3.3-70b-versatile",
          messages: [{ role: 'user', content: userContent }],
          temperature: 0.7
        })
      });
      const data = await res.json();
      return new Response(JSON.stringify({ reply: data.choices[0].message.content }), { status: 200 });
    }

    // Tương tự cho Gemini (Sử dụng fetch API để tối ưu Edge Runtime)
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const body = { contents: [{ parts: [{ text: text }] }] };
      // Note: Xử lý file cho Gemini trên Edge cần parse base64 phức tạp hơn một chút
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return new Response(JSON.stringify({ reply: data.candidates[0].content.parts[0].text }), { status: 200 });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
