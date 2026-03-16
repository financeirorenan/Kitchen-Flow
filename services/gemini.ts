
import { GoogleGenAI, Type } from "@google/genai";

export const getManagerInsights = async (salesData: any[], inventoryData: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Summarize sales data to reduce tokens
  const totalSales = salesData.reduce((acc, s) => acc + (s.total || 0), 0);
  const orderCount = salesData.length;
  const topItems = salesData
    .flatMap(s => s.items || [])
    .reduce((acc: any, item: any) => {
      acc[item.name] = (acc[item.name] || 0) + (item.quantity || 1);
      return acc;
    }, {});
  
  const top5Items = Object.entries(topItems)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => `${name}: ${qty} unid`);

  const lowStock = inventoryData
    .filter((i: any) => i.stock < 10)
    .slice(0, 10)
    .map(i => `${i.name}: ${i.stock} ${i.unit}`);

  const prompt = `Analise os seguintes dados resumidos de um restaurante e forneça 3 insights estratégicos curtos (máximo 2 frases cada) para o gestor.
  Vendas Totais: R$ ${totalSales.toFixed(2)} (${orderCount} pedidos)
  Top 5 Itens: ${top5Items.join(', ')}
  Estoque Baixo: ${lowStock.join(', ')}
  
  Considere CMV, lucro e eficiência operacional.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Não foi possível carregar os insights da IA no momento.";
  }
};

export const getObservationSuggestions = async (productName: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Sugira 4 observações de preparo curtas e comuns em restaurantes para o item: "${productName}". 
  Exemplos: "Sem cebola", "Bem passado", "Gelo e limão". 
  Retorne APENAS um array JSON de strings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json" 
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return ["Sem cebola", "Sem tomate", "Bem passado", "Ponto da casa"];
  }
};

export const analyzeCMV = async (products: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Filter and limit products to avoid token limit issues
  // Sort by CMV descending to analyze the most critical ones first
  const simplifiedProducts = products
    .map(p => ({
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.calculatedCost || p.cost,
      cmv: p.cmv || ((p.cost / p.price) * 100)
    }))
    .sort((a, b) => b.cmv - a.cmv)
    .slice(0, 50);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o CMV destes produtos considerando o custo real e o percentual atual de CMV. 
      Sugira ajustes de preços para otimizar a margem de lucro, visando um CMV entre 28% e 32%. 
      Retorne um JSON formatado com as sugestões.
      Produtos: ${JSON.stringify(simplifiedProducts)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              currentCMV: { type: Type.NUMBER },
              suggestion: { type: Type.STRING },
              newPrice: { type: Type.NUMBER }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("CMV Analysis Error:", error);
    // If it's a token limit error, try with even fewer products
    if (error instanceof Error && error.message.includes("token count exceeds")) {
      return analyzeCMV(products.slice(0, 20));
    }
    return [];
  }
};

export const generateProductImage = async (productName: string, category: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Uma foto profissional de comida em estilo de menu de restaurante: ${productName}, categoria ${category}. Fundo neutro, iluminação de estúdio, alta resolução.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};
