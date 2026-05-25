# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI(title="To-Do List Smart Input API")

# إعداد CORS للسماح للمتصفح بالاتصال
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# إعداد Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key or api_key == "your_api_key_here":
    print("WARNING: GEMINI_API_KEY is missing or not set properly in .env")
else:
    genai.configure(api_key=api_key)

class SmartInputRequest(BaseModel):
    text: str

prompt_template = """
أنت مساعد ذكي لتنظيم المهام.
قم بتحليل النص التالي واستخراج المهام المطلوبة. أرجع النتيجة بتنسيق JSON حصراً كقائمة من الكائنات (List of Objects)، 
بحيث يحتوي كل كائن على الحقول التالية: 
- "title": عنوان المهمة (سلسلة نصية)
- "date": التاريخ إن وُجد، وإلا اتركه فارغاً كـ "" (سلسلة نصية)
- "time": الوقت إن وُجد، وإلا اتركه فارغاً كـ "" (سلسلة نصية)

تأكد من أن المخرجات هي JSON صحيح وقابل للتحليل (Valid JSON) ولا يحتوي على أي نص آخر غير القائمة المباشرة `[]`.

النص: "{user_text}"
"""

@app.post("/api/extract-tasks")
async def extract_tasks(request: SmartInputRequest):
    if not api_key or api_key == "your_api_key_here":
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured. Please add it to the .env file.")
        
    try:
        model = genai.GenerativeModel('gemini-3.5-flash')
        prompt = prompt_template.replace("{user_text}", request.text)
        
        response = model.generate_content(prompt)
        
        # استخراج وتحليل JSON من الرد
        response_text = response.text.strip()
        
        # تنظيف الرد إذا احتوى على كتل الكود Markdown
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        response_text = response_text.strip()
        
        tasks_data = json.loads(response_text)
        
        # التأكد من أن المخرجات هي مصفوفة (List)
        if not isinstance(tasks_data, list):
            tasks_data = [tasks_data]
            
        return {"tasks": tasks_data}
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Raw Output: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response into JSON format.")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
