
import { GoogleGenAI, Type } from "@google/genai";
import { compressImage } from "../lib/imageUtils";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 5000): Promise<T> => {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      // Check for various ways 429/quota or 503/unavailable errors might be reported
      const isRetryable = 
        error.status === 429 || 
        error.status === 503 ||
        error.error?.code === 429 ||
        error.error?.code === 503 ||
        error.error?.status === 'RESOURCE_EXHAUSTED' ||
        error.message?.includes("429") || 
        error.message?.includes("503") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.message?.includes("UNAVAILABLE") ||
        error.message?.includes("quota") ||
        error.message?.includes("exhausted") ||
        error.message?.includes("high demand") ||
        (typeof error === 'string' && (error.includes("429") || error.includes("503") || error.includes("quota") || error.includes("UNAVAILABLE")));
      
      if (retries >= maxRetries || !isRetryable) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 2000;
      const delay = (initialDelay * Math.pow(2.5, retries)) + jitter;
      
      console.warn(`[Gemini AI] Transient error or Rate limit hit. Retrying in ${Math.round(delay)}ms (Attempt ${retries + 1}/${maxRetries})...`);
      await sleep(delay);
      retries++;
    }
  }
};

let insightsCache: { data: string; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export const getManagerInsights = async (salesData: any[], inventoryData: any[]) => {
  // Use cache if available and fresh
  if (insightsCache && (Date.now() - insightsCache.timestamp < CACHE_DURATION)) {
    console.log("[Gemini AI] Using cached insights.");
    return insightsCache.data;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
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
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    }));
    
    const result = response.text;
    insightsCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (error: any) {
    console.error("AI Insight Error:", error);
    
    // Check if it's a quota error to provide a better message
    const isQuotaError = 
      error.status === 429 || 
      error.error?.code === 429 || 
      error.message?.includes("429") || 
      error.message?.includes("RESOURCE_EXHAUSTED") ||
      error.message?.includes("quota");

    if (isQuotaError) {
      if (insightsCache) {
        return insightsCache.data + " (Nota: Estes insights podem estar desatualizados)";
      }
      return "O limite de processamento de IA foi atingido. Por favor, tente novamente em alguns minutos.";
    }

    return "Não foi possível carregar os insights da IA no momento.";
  }
};

export const getObservationSuggestions = async (productName: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Sugira 4 observações de preparo curtas e comuns em restaurantes para o item: "${productName}". 
  Exemplos: "Sem cebola", "Bem passado", "Gelo e limão". 
  Retorne APENAS um array JSON de strings.`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json" 
      }
    }));
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return ["Sem cebola", "Sem tomate", "Bem passado", "Ponto da casa"];
  }
};

let cmvCacheKey: string | null = null;
let cmvCache: { data: any[]; timestamp: number } | null = null;
const CMV_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const analyzeCMV = async (
  products: any[], 
  targetMargins?: { default: number; categories: Record<string, number>; products: Record<string, number> }
) => {
  const cacheKey = JSON.stringify({
    margins: targetMargins,
    productSignatures: products.map(p => `${p.id}-${p.price}-${p.calculatedCost || p.cost}`)
  });

  // Use cache if available and fresh
  if (cmvCache && cmvCacheKey === cacheKey && (Date.now() - cmvCache.timestamp < CMV_CACHE_DURATION)) {
    console.log("[Gemini AI] Using cached CMV analysis.");
    return cmvCache.data;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const defaultTarget = targetMargins?.default ?? 60;
  const categoryOverrides = targetMargins?.categories ?? { "Bebidas": 40 };
  const productOverrides = targetMargins?.products ?? {};

  // Filter and limit products to avoid token limit issues
  // Sort by CMV descending to analyze the most critical ones first
  const simplifiedProducts = products
    .map(p => {
      const cost = p.calculatedCost || p.cost;
      const targetMargin = productOverrides[p.id] || productOverrides[p.name] || categoryOverrides[p.category || 'Geral'] || defaultTarget;
      const targetCMV = 100 - targetMargin;
      
      return {
        id: p.id,
        name: p.name,
        category: p.category || 'Geral',
        price: p.price,
        cost: cost,
        cmv: p.cmv || ((cost / p.price) * 100),
        targetMarginPercent: targetMargin,
        targetCmvPercent: targetCMV
      };
    })
    .sort((a, b) => b.cmv - a.cmv)
    .slice(0, 50);

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o CMV real destes produtos considerando o custo real e a Margem de Lucro Desejada configurada pelo lojista (indicada em cada produto como "targetMarginPercent", o que equivale a um percentual de CMV Alvo de "targetCmvPercent"). 

      A Margem de Lucro Desejada foi personalizada para categorias como Bebidas para ser menor (como 40%) e maior em pratos normais (como 60%).
      
      Instruções para o retorno:
      1. Calcule o Preço Sugerido Ideal de forma matemática baseado na margem desejada de cada produto: Preço Ideal = Custo / (1 - Margem Desejada / 100).
      2. No retorno, arredonde o "newPrice" resultante para valores comerciais atraentes em real (R$) (ex: se der 19.82, sugira 19.90 ou 19.99; se der 24.15, sugira 24.00, 24.50 ou 24.90).
      3. Na "suggestion" (em português do Brasil e bem amigável):
         - Se o preço atual for saudável (CMV real menor ou igual ao CMV alvo, ou seja, margem real é satisfatória), parabenize o lojista e sugira manter ou dar uma pequena dica operacional para aumentar o giro.
         - Se o preço atual for crítico (CMV real maior que o CMV alvo, ou seja, margem real menor do que a desejada), explique de forma transparente o problema e como as matérias-primas pesaram, sugerindo que o novo preço ajudará a alcançar a margem de ${defaultTarget}% (ou a margem específica daquela categoria). Forneça dicas sobre como justificar ou compensar esse aumento aos clientes no cardápio de forma inteligente (por exemplo, enfatizando tamanho da porção, combos ou qualidade).
         
      Retorne um JSON formatado estritamente de acordo com o schema solicitado contendo as sugestões de ajuste.
      Produtos para análise: ${JSON.stringify(simplifiedProducts)}`,
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
    }));

    const result = JSON.parse(response.text || '[]');
    cmvCache = { data: result, timestamp: Date.now() };
    cmvCacheKey = cacheKey;
    return result;
  } catch (error: any) {
    console.error("CMV Analysis Error:", error);
    // If it's a token limit error, try with even fewer products
    if (error instanceof Error && error.message.includes("token count exceeds")) {
      return analyzeCMV(products.slice(0, 20), targetMargins);
    }
    
    // Check for quota error
    const isQuotaError = 
      error.status === 429 || 
      error.error?.code === 429 || 
      error.message?.includes("429") || 
      error.message?.includes("RESOURCE_EXHAUSTED");

    if (isQuotaError && cmvCache) {
      return cmvCache.data;
    }
    
    return [];
  }
};


