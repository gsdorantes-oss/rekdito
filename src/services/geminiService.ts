import { GoogleGenAI, Type } from "@google/genai";

export interface NutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  vitamins: string[];
  benefits: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  difficulty: 'Fácil' | 'Media' | 'Difícil';
}

// Initialize Gemini client on the frontend
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYY || (import.meta as any).env.VITE_GEMINI_API_KEY || "";
  const cleanKey = key.replace(/\s/g, "").replace(/["']/g, "");
  if (cleanKey) {
    const masked = cleanKey.substring(0, 6) + "..." + cleanKey.substring(cleanKey.length - 4);
    console.log(`[Gemini] Usando clave: ${masked} (Longitud: ${cleanKey.length})`);
  }
  return cleanKey;
};

const ai = new GoogleGenAI({ 
  apiKey: getApiKey() 
});

const validateKey = (key: string) => {
  if (!key) {
    throw new Error("No se ha configurado la clave de API. Por favor, añádela como GEMINI_API_KEY en los Secrets.");
  }
  if (!key.startsWith("AIza")) {
    throw new Error("La clave de API no parece válida (debe empezar por 'AIza'). Por favor, verifica que copiaste la clave de Google AI Studio correctamente.");
  }
};

export const getNutritionalInfo = async (productName: string): Promise<NutritionalInfo> => {
  const apiKey = getApiKey();
  validateKey(apiKey);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Proporciona información nutricional detallada para: ${productName}. 
        Incluye calorías, proteínas, carbohidratos, grasas, vitaminas principales y beneficios para la salud. 
        Responde estrictamente en español y en formato JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.STRING },
            protein: { type: Type.STRING },
            carbs: { type: Type.STRING },
            fats: { type: Type.STRING },
            vitamins: { type: Type.ARRAY, items: { type: Type.STRING } },
            benefits: { type: Type.STRING }
          },
          required: ["calories", "protein", "carbs", "fats", "vitamins", "benefits"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No se recibió respuesta de la IA");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error generating nutritional info:", error);
    throw new Error(error.message || "No se pudo generar la información nutricional.");
  }
};

export const getRecipes = async (productName: string): Promise<Recipe[]> => {
  const apiKey = getApiKey();
  validateKey(apiKey);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera 2 recetas de platos famosos (como ensaladas gourmet, platos tradicionales o postres conocidos) que utilicen como ingrediente principal o destacado: ${productName}. 
        Incluye recomendaciones del chef para cada plato. 
        Responde estrictamente en español y en formato JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: { type: Type.STRING, enum: ["Fácil", "Media", "Difícil"] }
            },
            required: ["title", "ingredients", "instructions", "difficulty"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No se recibió respuesta de la IA");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error generating recipes:", error);
    throw new Error(error.message || "No se pudo generar las recetas.");
  }
};
